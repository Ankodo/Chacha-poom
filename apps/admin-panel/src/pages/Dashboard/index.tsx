import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  Server,
  ArrowUpDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  onlineNodes: number;
  totalNodes: number;
  totalTrafficBytes: number;
  trafficSeries: { date: string; bytes: number }[];
  userSeries: { date: string; count: number }[];
  recentActivities: {
    user: string;
    action: string;
    time: string;
  }[];
}

const MOCK_STATS: DashboardStats = {
  totalUsers: 1_284,
  activeSubscriptions: 967,
  onlineNodes: 12,
  totalNodes: 15,
  totalTrafficBytes: 2.4 * 1024 ** 4, // ~2.4 TB
  trafficSeries: [
    { date: "Mar 8", bytes: 48 * 1024 ** 3 },
    { date: "Mar 9", bytes: 52 * 1024 ** 3 },
    { date: "Mar 10", bytes: 61 * 1024 ** 3 },
    { date: "Mar 11", bytes: 45 * 1024 ** 3 },
    { date: "Mar 12", bytes: 72 * 1024 ** 3 },
    { date: "Mar 13", bytes: 68 * 1024 ** 3 },
    { date: "Mar 14", bytes: 55 * 1024 ** 3 },
  ],
  userSeries: [
    { date: "Mar 8", count: 18 },
    { date: "Mar 9", count: 24 },
    { date: "Mar 10", count: 12 },
    { date: "Mar 11", count: 31 },
    { date: "Mar 12", count: 22 },
    { date: "Mar 13", count: 27 },
    { date: "Mar 14", count: 19 },
  ],
  recentActivities: [
    { user: "alice@example.com", action: "Subscription renewed", time: "2026-03-14T10:32:00Z" },
    { user: "bob@example.com", action: "New user registered", time: "2026-03-14T09:15:00Z" },
    { user: "charlie@example.com", action: "Traffic limit reached", time: "2026-03-14T08:47:00Z" },
    { user: "diana@example.com", action: "Plan upgraded to Pro", time: "2026-03-13T22:10:00Z" },
    { user: "eve@example.com", action: "Password changed", time: "2026-03-13T20:05:00Z" },
  ],
};

async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const { data } = await api.get("/admin/stats/dashboard");
    return data;
  } catch {
    // Fallback to mock data while the API is not yet implemented
    return MOCK_STATS;
  }
}

const STATS_CARDS = [
  {
    title: "Total Users",
    icon: Users,
    getValue: (s: DashboardStats) => formatNumber(s.totalUsers),
    accent: false,
  },
  {
    title: "Active Subscriptions",
    icon: UserCheck,
    getValue: (s: DashboardStats) => formatNumber(s.activeSubscriptions),
    accent: true,
  },
  {
    title: "Online Nodes",
    icon: Server,
    getValue: (s: DashboardStats) => `${s.onlineNodes} / ${s.totalNodes}`,
    accent: false,
  },
  {
    title: "Total Traffic",
    icon: ArrowUpDown,
    getValue: (s: DashboardStats) => formatBytes(s.totalTrafficBytes),
    accent: false,
  },
] as const;

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertCircle className="h-8 w-8" />
        <p>Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your proxy infrastructure.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS_CARDS.map(({ title, icon: Icon, getValue, accent }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon
                className={`h-4 w-4 ${accent ? "text-green-500" : "text-muted-foreground"}`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${accent ? "text-green-500" : ""}`}
              >
                {getValue(stats)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Traffic Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trafficSeries}>
                  <defs>
                    <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatBytes(v)}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    formatter={(value: number) => [formatBytes(value), "Traffic"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="bytes"
                    stroke="hsl(142, 71%, 45%)"
                    fill="url(#trafficGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Users (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.userSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    formatter={(value: number) => [formatNumber(value), "New Users"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentActivities.map((activity, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{activity.user}</TableCell>
                  <TableCell>{activity.action}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDate(activity.time)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
