import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import StatsCards from "@/components/StatsCards";
import TrafficChart from "@/components/TrafficChart";
import NodeMap from "@/components/NodeMap";
import AlertsList from "@/components/AlertsList";
import api from "@/lib/api";
import { formatDate } from "@/lib/format";

interface RecentUser {
  id: string;
  email: string;
  created_at: string;
  status: "active" | "inactive";
}

const MOCK_RECENT_USERS: RecentUser[] = [
  {
    id: "1",
    email: "alice@example.com",
    created_at: "2026-03-14T10:32:00Z",
    status: "active",
  },
  {
    id: "2",
    email: "bob@example.com",
    created_at: "2026-03-14T09:15:00Z",
    status: "active",
  },
  {
    id: "3",
    email: "charlie@example.com",
    created_at: "2026-03-13T22:47:00Z",
    status: "active",
  },
  {
    id: "4",
    email: "diana@example.com",
    created_at: "2026-03-13T18:10:00Z",
    status: "inactive",
  },
  {
    id: "5",
    email: "eve@example.com",
    created_at: "2026-03-13T15:05:00Z",
    status: "active",
  },
];

async function fetchRecentUsers(): Promise<RecentUser[]> {
  try {
    const { data } = await api.get("/admin/users", {
      params: { limit: 5, sort: "-created_at" },
    });
    return data.items ?? data;
  } catch {
    return MOCK_RECENT_USERS;
  }
}

export default function Dashboard() {
  const {
    data: recentUsers,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["recent-users"],
    queryFn: fetchRecentUsers,
    refetchInterval: 60_000,
  });

  if (isError) {
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
        <p className="mt-1 text-muted-foreground">
          Overview of your proxy infrastructure.
        </p>
      </div>

      {/* Stats Cards Row */}
      <StatsCards />

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          <TrafficChart />
          <NodeMap />
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          <AlertsList />

          {/* Recent signups */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Signups</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(recentUsers ?? []).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {user.email}
                            </span>
                            {user.status === "inactive" && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                inactive
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
