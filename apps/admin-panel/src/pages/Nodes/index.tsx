import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, Server } from "lucide-react";
import api from "@/lib/api";
import { formatBytes } from "@/lib/format";
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

interface Node {
  id: string;
  name: string;
  host: string;
  country_code: string;
  status: "online" | "offline" | "degraded" | "maintenance";
  xray_version?: string;
  singbox_version?: string;
  user_count: number;
  traffic_total: number;
}

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-red-500",
  degraded: "bg-yellow-500",
  maintenance: "bg-gray-500",
};

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}",
  DE: "\u{1F1E9}\u{1F1EA}",
  NL: "\u{1F1F3}\u{1F1F1}",
  FI: "\u{1F1EB}\u{1F1EE}",
  FR: "\u{1F1EB}\u{1F1F7}",
  GB: "\u{1F1EC}\u{1F1E7}",
  RU: "\u{1F1F7}\u{1F1FA}",
  TR: "\u{1F1F9}\u{1F1F7}",
  JP: "\u{1F1EF}\u{1F1F5}",
  SG: "\u{1F1F8}\u{1F1EC}",
  KR: "\u{1F1F0}\u{1F1F7}",
  CA: "\u{1F1E8}\u{1F1E6}",
  AU: "\u{1F1E6}\u{1F1FA}",
  SE: "\u{1F1F8}\u{1F1EA}",
  IR: "\u{1F1EE}\u{1F1F7}",
};

function getFlag(code: string): string {
  return COUNTRY_FLAGS[code?.toUpperCase()] ?? "\u{1F3F3}\u{FE0F}";
}

export default function Nodes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: nodes = [], isLoading } = useQuery<Node[]>({
    queryKey: ["nodes"],
    queryFn: async () => {
      const { data } = await api.get("/admin/nodes");
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return nodes;
    const q = search.toLowerCase();
    return nodes.filter((n) => n.name.toLowerCase().includes(q));
  }, [nodes, search]);

  const stats = useMemo(() => {
    const counts = { total: nodes.length, online: 0, offline: 0, degraded: 0 };
    for (const n of nodes) {
      if (n.status === "online") counts.online++;
      else if (n.status === "offline") counts.offline++;
      else if (n.status === "degraded") counts.degraded++;
    }
    return counts;
  }, [nodes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nodes</h1>
          <p className="text-muted-foreground mt-1">Manage proxy nodes.</p>
        </div>
        <Button onClick={() => navigate("/nodes/new")}>
          <Plus className="h-4 w-4" />
          Add Node
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="gap-1.5">
          <Server className="h-3 w-3" />
          {stats.total} Total
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {stats.online} Online
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {stats.offline} Offline
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          {stats.degraded} Degraded
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Cores</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Traffic</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Loading nodes...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No nodes found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((node) => (
                  <TableRow
                    key={node.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/nodes/${node.id}`)}
                  >
                    <TableCell>
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[node.status] ?? "bg-gray-500"}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell>
                      <span className="mr-1.5">{getFlag(node.country_code)}</span>
                      {node.country_code}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {node.host}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {node.xray_version && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            xray
                          </Badge>
                        )}
                        {node.singbox_version && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            singbox
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{node.user_count}</TableCell>
                    <TableCell className="text-right">
                      {formatBytes(node.traffic_total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/nodes/${node.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
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
    </div>
  );
}
