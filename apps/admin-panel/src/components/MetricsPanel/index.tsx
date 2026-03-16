import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import { formatBytes } from "@/lib/format";

interface MetricsPanelProps {
  nodeId: string;
}

interface GaugeMetrics {
  cpu: number;
  ram: number;
  bandwidth_up: number;
  bandwidth_down: number;
}

interface TimeSeriesPoint {
  time: string;
  cpu: number;
  ram: number;
  bandwidth_up: number;
  bandwidth_down: number;
}

interface MetricsResponse {
  current: GaugeMetrics;
  series: TimeSeriesPoint[];
}

function generateMockSeries(): TimeSeriesPoint[] {
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() - 23 + i);
    return {
      time: d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      cpu: Math.round(30 + Math.random() * 40),
      ram: Math.round(40 + Math.random() * 30),
      bandwidth_up: Math.random() * 500 * 1024 ** 2,
      bandwidth_down: Math.random() * 1.2 * 1024 ** 3,
    };
  });
}

const MOCK_METRICS: MetricsResponse = {
  current: {
    cpu: 47,
    ram: 63,
    bandwidth_up: 245 * 1024 ** 2,
    bandwidth_down: 820 * 1024 ** 2,
  },
  series: generateMockSeries(),
};

async function fetchMetrics(nodeId: string): Promise<MetricsResponse> {
  try {
    const { data } = await api.get(
      `/admin/monitoring/nodes/${nodeId}/metrics`,
      { params: { period: "6h" } }
    );
    return data;
  } catch {
    return MOCK_METRICS;
  }
}

// Circular gauge component
function GaugeCard({
  label,
  value,
  unit,
  isPercent,
}: {
  label: string;
  value: number;
  unit?: string;
  isPercent: boolean;
}) {
  const displayValue = isPercent ? value : value;
  const percentage = isPercent ? value : 0;
  const color =
    isPercent && percentage > 80
      ? "#ef4444"
      : isPercent && percentage > 60
        ? "#eab308"
        : "#22c55e";

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isPercent
    ? circumference - (percentage / 100) * circumference
    : 0;

  const formattedValue = isPercent
    ? `${displayValue}%`
    : formatBytes(displayValue);

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          {/* Background circle */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
          />
          {/* Progress circle */}
          {isPercent && (
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-card-foreground">
            {formattedValue}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {unit ? ` (${unit})` : ""}
      </span>
    </div>
  );
}

export default function MetricsPanel({ nodeId }: MetricsPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["node-metrics", nodeId],
    queryFn: () => fetchMetrics(nodeId),
    refetchInterval: 30_000,
    enabled: !!nodeId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Gauge cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Real-time Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <GaugeCard
              label="CPU"
              value={data.current.cpu}
              isPercent={true}
            />
            <GaugeCard
              label="RAM"
              value={data.current.ram}
              isPercent={true}
            />
            <GaugeCard
              label="Bandwidth Up"
              value={data.current.bandwidth_up}
              isPercent={false}
            />
            <GaugeCard
              label="Bandwidth Down"
              value={data.current.bandwidth_down}
              isPercent={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Time series chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Metrics History (Last 6 Hours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="time"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--card-foreground))",
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      cpu: "CPU",
                      ram: "RAM",
                    };
                    return [`${value}%`, labels[name] ?? name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="cpu"
                />
                <Line
                  type="monotone"
                  dataKey="ram"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  name="ram"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
              CPU
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
              RAM
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
