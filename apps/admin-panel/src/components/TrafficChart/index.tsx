import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import { formatBytes } from "@/lib/format";

type Period = "24h" | "7d" | "30d";

interface TrafficDataPoint {
  time: string;
  upload: number;
  download: number;
}

interface TrafficChartProps {
  period?: Period;
  nodeId?: string;
}

const PERIOD_LABELS: Record<Period, string> = {
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
};

const MOCK_DATA: Record<Period, TrafficDataPoint[]> = {
  "24h": Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    upload: Math.random() * 2 * 1024 ** 3 + 0.5 * 1024 ** 3,
    download: Math.random() * 5 * 1024 ** 3 + 1 * 1024 ** 3,
  })),
  "7d": Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      time: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      upload: Math.random() * 20 * 1024 ** 3 + 5 * 1024 ** 3,
      download: Math.random() * 50 * 1024 ** 3 + 10 * 1024 ** 3,
    };
  }),
  "30d": Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return {
      time: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      upload: Math.random() * 20 * 1024 ** 3 + 5 * 1024 ** 3,
      download: Math.random() * 50 * 1024 ** 3 + 10 * 1024 ** 3,
    };
  }),
};

async function fetchTraffic(
  period: Period,
  nodeId?: string
): Promise<TrafficDataPoint[]> {
  try {
    const params: Record<string, string> = { period };
    if (nodeId) params.node_id = nodeId;
    const { data } = await api.get("/admin/stats/traffic", { params });
    return data;
  } catch {
    return MOCK_DATA[period];
  }
}

export default function TrafficChart({
  period: initialPeriod = "7d",
  nodeId,
}: TrafficChartProps) {
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const { data, isLoading } = useQuery({
    queryKey: ["traffic", period, nodeId],
    queryFn: () => fetchTraffic(period, nodeId),
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">
          Traffic ({PERIOD_LABELS[period]})
        </CardTitle>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] min-h-[300px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(142, 71%, 45%)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(142, 71%, 45%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="downloadGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(217, 91%, 60%)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(217, 91%, 60%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="time"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => formatBytes(v)}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--card-foreground))",
                  }}
                  formatter={(value: number, name: string) => [
                    formatBytes(value),
                    name === "upload" ? "Upload" : "Download",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="upload"
                  stroke="hsl(142, 71%, 45%)"
                  fill="url(#uploadGrad)"
                  strokeWidth={2}
                  name="upload"
                />
                <Area
                  type="monotone"
                  dataKey="download"
                  stroke="hsl(217, 91%, 60%)"
                  fill="url(#downloadGrad)"
                  strokeWidth={2}
                  name="download"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            Upload
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
            Download
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
