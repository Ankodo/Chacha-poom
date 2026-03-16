import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

interface NodeLocation {
  id: string;
  name: string;
  country_code: string;
  status: "online" | "offline" | "degraded";
  users: number;
  cpu: number;
}

interface TooltipData {
  node: NodeLocation;
  x: number;
  y: number;
}

// Approximate lat/lng for common country codes
const COUNTRY_COORDS: Record<string, [number, number]> = {
  DE: [10, 51],
  NL: [5, 52],
  FI: [25, 61],
  US: [-100, 40],
  GB: [-2, 54],
  FR: [2, 47],
  SE: [15, 62],
  NO: [10, 62],
  CA: [-106, 56],
  AU: [134, -25],
  JP: [139, 36],
  SG: [104, 1],
  KR: [127, 37],
  BR: [-51, -10],
  IN: [78, 21],
  RU: [60, 55],
  TR: [35, 39],
  AE: [54, 24],
  ZA: [25, -29],
  PL: [20, 52],
  CZ: [15, 50],
  AT: [14, 47],
  CH: [8, 47],
  IT: [12, 42],
  ES: [-4, 40],
  HK: [114, 22],
  TW: [121, 24],
  UA: [32, 49],
  RO: [25, 46],
  BG: [25, 43],
  HU: [19, 47],
  IE: [-8, 53],
  DK: [10, 56],
  LT: [24, 55],
  LV: [24, 57],
  EE: [25, 59],
  PT: [-8, 39],
  AR: [-64, -34],
  CL: [-71, -30],
  MX: [-102, 23],
  TH: [101, 14],
  VN: [106, 16],
  ID: [117, -2],
  MY: [102, 4],
  PH: [122, 12],
  NZ: [174, -41],
  IL: [35, 31],
  SA: [45, 24],
  EG: [31, 27],
  KE: [38, 0],
  NG: [8, 10],
  CO: [-74, 4],
  PE: [-76, -10],
};

const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  offline: "#ef4444",
  degraded: "#eab308",
};

const MOCK_NODES: NodeLocation[] = [
  { id: "1", name: "Frankfurt-1", country_code: "DE", status: "online", users: 342, cpu: 45 },
  { id: "2", name: "Amsterdam-1", country_code: "NL", status: "online", users: 281, cpu: 52 },
  { id: "3", name: "Helsinki-1", country_code: "FI", status: "online", users: 156, cpu: 38 },
  { id: "4", name: "US-East-1", country_code: "US", status: "degraded", users: 420, cpu: 78 },
  { id: "5", name: "London-1", country_code: "GB", status: "online", users: 198, cpu: 41 },
  { id: "6", name: "Tokyo-1", country_code: "JP", status: "online", users: 267, cpu: 55 },
  { id: "7", name: "Singapore-1", country_code: "SG", status: "offline", users: 0, cpu: 0 },
  { id: "8", name: "Sydney-1", country_code: "AU", status: "online", users: 89, cpu: 32 },
];

// Convert lat/lng to SVG coordinates using Mercator-like projection
function toSvg(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * 800;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 200 - (mercN / Math.PI) * 200;
  return [x, y];
}

async function fetchNodes(): Promise<NodeLocation[]> {
  try {
    const { data } = await api.get("/admin/nodes");
    return data.map(
      (n: {
        id: string;
        name: string;
        country_code: string;
        status: string;
        user_count?: number;
        metrics?: { cpu: number };
      }) => ({
        id: n.id,
        name: n.name,
        country_code: n.country_code,
        status: n.status as NodeLocation["status"],
        users: n.user_count ?? 0,
        cpu: n.metrics?.cpu ?? 0,
      })
    );
  } catch {
    return MOCK_NODES;
  }
}

export default function NodeMap() {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { data: nodes, isLoading } = useQuery({
    queryKey: ["node-map"],
    queryFn: fetchNodes,
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Node Locations</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox="0 0 800 400"
              className="h-auto w-full"
              style={{ minHeight: 200 }}
            >
              {/* World outline - simplified continental shapes */}
              <g
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="0.8"
                opacity="0.5"
              >
                {/* North America */}
                <path d="M60,80 L120,50 L180,55 L220,60 L240,80 L230,110 L220,130 L200,150 L180,170 L160,180 L140,190 L130,200 L120,210 L110,190 L100,170 L80,150 L70,130 L60,110 Z" />
                {/* South America */}
                <path d="M160,220 L180,210 L200,220 L210,240 L220,260 L225,280 L220,300 L210,320 L200,340 L190,350 L175,340 L165,320 L155,300 L150,280 L145,260 L150,240 Z" />
                {/* Europe */}
                <path d="M350,60 L370,55 L400,50 L430,55 L450,60 L460,70 L455,90 L440,100 L420,110 L400,115 L380,110 L360,100 L350,85 Z" />
                {/* Africa */}
                <path d="M370,130 L400,120 L430,125 L450,140 L460,160 L465,190 L460,220 L450,250 L440,270 L430,290 L415,300 L400,305 L385,295 L375,275 L365,250 L360,220 L355,190 L360,160 Z" />
                {/* Asia */}
                <path d="M460,50 L500,45 L550,50 L600,55 L650,60 L680,70 L700,80 L710,100 L700,120 L680,130 L660,140 L640,145 L620,150 L590,145 L560,140 L530,130 L500,120 L480,110 L465,95 L460,75 Z" />
                {/* Australia */}
                <path d="M640,260 L670,250 L700,255 L720,265 L730,280 L725,300 L710,310 L690,315 L670,310 L655,300 L645,285 L640,270 Z" />
              </g>

              {/* Grid lines */}
              <g stroke="hsl(var(--border))" strokeWidth="0.3" opacity="0.2">
                {/* Horizontal */}
                <line x1="0" y1="100" x2="800" y2="100" />
                <line x1="0" y1="200" x2="800" y2="200" />
                <line x1="0" y1="300" x2="800" y2="300" />
                {/* Vertical */}
                <line x1="200" y1="0" x2="200" y2="400" />
                <line x1="400" y1="0" x2="400" y2="400" />
                <line x1="600" y1="0" x2="600" y2="400" />
              </g>

              {/* Node dots */}
              {nodes?.map((node) => {
                const coords = COUNTRY_COORDS[node.country_code];
                if (!coords) return null;
                const [x, y] = toSvg(coords[0], coords[1]);
                const color = STATUS_COLORS[node.status] ?? "#6b7280";

                return (
                  <g
                    key={node.id}
                    onMouseEnter={(e) => {
                      const svg = e.currentTarget.closest("svg");
                      if (!svg) return;
                      const rect = svg.getBoundingClientRect();
                      const scaleX = rect.width / 800;
                      const scaleY = rect.height / 400;
                      setTooltip({
                        node,
                        x: x * scaleX,
                        y: y * scaleY,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Pulsing outer ring for online nodes */}
                    {node.status === "online" && (
                      <circle cx={x} cy={y} r="8" fill={color} opacity="0.2">
                        <animate
                          attributeName="r"
                          values="6;12;6"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.3;0.05;0.3"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    {/* Inner dot */}
                    <circle cx={x} cy={y} r="5" fill={color} />
                    <circle cx={x} cy={y} r="2.5" fill="white" opacity="0.4" />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-border bg-card px-3 py-2 shadow-lg"
                style={{
                  left: tooltip.x + 12,
                  top: tooltip.y - 10,
                  transform: "translateY(-50%)",
                }}
              >
                <p className="text-sm font-semibold text-card-foreground">
                  {tooltip.node.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tooltip.node.country_code}
                </p>
                <div className="mt-1 space-y-0.5 text-xs">
                  <p>
                    Status:{" "}
                    <span
                      style={{
                        color: STATUS_COLORS[tooltip.node.status],
                      }}
                    >
                      {tooltip.node.status}
                    </span>
                  </p>
                  <p>Users: {tooltip.node.users}</p>
                  <p>CPU: {tooltip.node.cpu}%</p>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                Online
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />
                Degraded
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                Offline
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
