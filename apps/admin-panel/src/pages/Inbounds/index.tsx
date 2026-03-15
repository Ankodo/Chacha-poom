import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface Inbound {
  id: string;
  node_name: string;
  node_id: string;
  protocol: string;
  transport: string;
  security: string;
  port: number;
  mode: string;
  user_count: number;
  status: "active" | "inactive";
}

interface NodeOption {
  id: string;
  name: string;
}

const PROTOCOL_COLORS: Record<string, string> = {
  vless: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  trojan: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  vmess: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  hysteria2: "bg-green-500/15 text-green-400 border-green-500/30",
  shadowsocks: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  tuic: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const PROTOCOL_OPTIONS = ["all", "vless", "trojan", "vmess", "hysteria2", "shadowsocks", "tuic"] as const;

export default function Inbounds() {
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [nodeFilter, setNodeFilter] = useState("all");

  const { data: inbounds = [], isLoading } = useQuery<Inbound[]>({
    queryKey: ["inbounds"],
    queryFn: async () => {
      const { data } = await api.get("/admin/inbounds");
      return data;
    },
  });

  const { data: nodes = [] } = useQuery<NodeOption[]>({
    queryKey: ["nodes-list"],
    queryFn: async () => {
      const { data } = await api.get("/admin/nodes");
      return data.map((n: { id: string; name: string }) => ({ id: n.id, name: n.name }));
    },
  });

  const filtered = useMemo(() => {
    return inbounds.filter((ib) => {
      if (protocolFilter !== "all" && ib.protocol.toLowerCase() !== protocolFilter) return false;
      if (nodeFilter !== "all" && ib.node_id !== nodeFilter) return false;
      return true;
    });
  }, [inbounds, protocolFilter, nodeFilter]);

  function getProtocolBadgeClass(protocol: string): string {
    return PROTOCOL_COLORS[protocol.toLowerCase()] ?? "bg-secondary text-secondary-foreground";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inbounds</h1>
          <p className="text-muted-foreground mt-1">Manage inbound configurations.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Inbound
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={protocolFilter}
          onChange={(e) => setProtocolFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {PROTOCOL_OPTIONS.map((p) => (
            <option key={p} value={p} className="bg-popover text-popover-foreground">
              {p === "all" ? "All Protocols" : p.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={nodeFilter}
          onChange={(e) => setNodeFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all" className="bg-popover text-popover-foreground">
            All Nodes
          </option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id} className="bg-popover text-popover-foreground">
              {n.name}
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
                <TableHead>Node</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Transport</TableHead>
                <TableHead>Security</TableHead>
                <TableHead className="text-right">Port</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Loading inbounds...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No inbounds found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ib) => (
                  <TableRow key={ib.id}>
                    <TableCell className="font-medium">{ib.node_name}</TableCell>
                    <TableCell>
                      <Badge className={getProtocolBadgeClass(ib.protocol)}>
                        {ib.protocol.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{ib.transport}</TableCell>
                    <TableCell className="text-sm">{ib.security}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{ib.port}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ib.mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{ib.user_count}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          ib.status === "active"
                            ? "bg-green-500/15 text-green-400 border-green-500/30"
                            : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                        }
                      >
                        {ib.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
    </div>
  );
}
