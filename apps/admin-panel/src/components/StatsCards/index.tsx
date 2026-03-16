import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  Server,
  ArrowUpDown,
  DollarSign,
  Settings2,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { formatBytes, formatNumber } from "@/lib/format";

interface StatCardData {
  value: number;
  change: number; // percentage change
  trend: number[]; // 7-day sparkline data
}

interface DashboardStatsData {
  total_users: StatCardData;
  active_users: StatCardData;
  online_nodes: StatCardData;
  total_traffic: StatCardData;
  revenue: StatCardData;
  active_configs: StatCardData;
}

interface CardConfig {
  key: keyof DashboardStatsData;
  label: string;
  icon: LucideIcon;
  format: (v: number) => string;
}

const CARD_CONFIGS: CardConfig[] = [
  {
    key: "total_users",
    label: "Total Users",
    icon: Users,
    format: (v) => formatNumber(v),
  },
  {
    key: "active_users",
    label: "Active Users",
    icon: UserCheck,
    format: (v) => formatNumber(v),
  },
  {
    key: "online_nodes",
    label: "Online Nodes",
    icon: Server,
    format: (v) => formatNumber(v),
  },
  {
    key: "total_traffic",
    label: "Total Traffic",
    icon: ArrowUpDown,
    format: (v) => formatBytes(v),
  },
  {
    key: "revenue",
    label: "Revenue",
    icon: DollarSign,
    format: (v) => `$${formatNumber(v)}`,
  },
  {
    key: "active_configs",
    label: "Active Configs",
    icon: Settings2,
    format: (v) => formatNumber(v),
  },
];

const MOCK_STATS: DashboardStatsData = {
  total_users: {
    value: 1284,
    change: 12.5,
    trend: [1100, 1130, 1165, 1190, 1220, 1250, 1284],
  },
  active_users: {
    value: 967,
    change: 8.2,
    trend: [820, 845, 870, 900, 920, 945, 967],
  },
  online_nodes: {
    value: 12,
    change: 0,
    trend: [11, 12, 12, 11, 13, 12, 12],
  },
  total_traffic: {
    value: 2.4 * 1024 ** 4,
    change: 15.3,
    trend: [1.8, 1.9, 2.0, 2.1, 2.15, 2.3, 2.4].map((v) => v * 1024 ** 4),
  },
  revenue: {
    value: 8420,
    change: 5.7,
    trend: [7200, 7400, 7600, 7800, 8000, 8200, 8420],
  },
  active_configs: {
    value: 3156,
    change: -2.1,
    trend: [3300, 3280, 3250, 3220, 3200, 3180, 3156],
  },
};

async function fetchStats(): Promise<DashboardStatsData> {
  try {
    const { data } = await api.get("/admin/stats/dashboard");
    return data;
  } catch {
    return MOCK_STATS;
  }
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div className="h-8 w-16">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats-cards"],
    queryFn: fetchStats,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {CARD_CONFIGS.map((config) => (
          <Card key={config.key}>
            <CardContent className="flex h-24 items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {CARD_CONFIGS.map((config) => {
        const stat = stats[config.key];
        const Icon = config.icon;
        const isPositive = stat.change >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;
        const trendColor = isPositive ? "#22c55e" : "#ef4444";

        return (
          <Card key={config.key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <Sparkline data={stat.trend} color={trendColor} />
              </div>
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {config.label}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold">
                    {config.format(stat.value)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <TrendIcon
                    className="h-3 w-3"
                    style={{ color: trendColor }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: trendColor }}
                  >
                    {isPositive ? "+" : ""}
                    {stat.change.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
