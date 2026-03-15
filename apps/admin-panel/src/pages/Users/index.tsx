import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface User {
  id: string;
  username: string;
  email?: string;
  telegram_id?: string;
  plan_name?: string;
  status: "active" | "expired" | "disabled" | "limited";
  traffic_used: number;
  traffic_limit: number;
  expire_at?: string;
  sub_link?: string;
}

interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  per_page: number;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  disabled: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  limited: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const STATUS_OPTIONS = ["all", "active", "expired", "disabled", "limited"] as const;

export default function Users() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["users", page, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (statusFilter !== "all") params.status = statusFilter;
      const { data } = await api.get("/admin/users", { params });
      return data;
    },
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / perPage);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [users, search]);

  function formatTraffic(used: number, limit: number): string {
    if (limit <= 0) return `${formatBytes(used)} / \u221E`;
    return `${formatBytes(used)} / ${formatBytes(limit)}`;
  }

  function copySubLink(link?: string) {
    if (link) navigator.clipboard.writeText(link);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-popover text-popover-foreground">
              {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Traffic</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.telegram_id ?? "\u2014"}
                    </TableCell>
                    <TableCell>
                      {user.plan_name ? (
                        <Badge variant="secondary">{user.plan_name}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">\u2014</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[user.status] ?? ""}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatTraffic(user.traffic_used, user.traffic_limit)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.expire_at ? formatDate(user.expire_at) : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Copy Sub-link"
                          onClick={() => copySubLink(user.sub_link)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * perPage + 1}\u2013{Math.min(page * perPage, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
