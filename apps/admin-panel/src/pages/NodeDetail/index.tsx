import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Server, Cpu, MemoryStick, Activity } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MetricsPanel from "@/components/MetricsPanel";
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
  protocol: string;
  transport: string;
  security: string;
  port: number;
  user_count: number;
  status: "active" | "inactive";
}

interface NodeDetailData {
  id: string;
  name: string;
  host: string;
  country_code: string;
  region: string;
  status: "online" | "offline" | "degraded" | "maintenance";
  xray_version?: string;
  xray_status?: string;
  singbox_version?: string;
  singbox_status?: string;
  inbounds: Inbound[];
  metrics?: {
    cpu: number;
    ram: number;
    bandwidth: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500/15 text-green-400 border-green-500/30",
  offline: "bg-red-500/15 text-red-400 border-red-500/30",
  degraded: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  maintenance: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const CORE_STATUS_COLORS: Record<string, string> = {
  running: "bg-green-500/15 text-green-400 border-green-500/30",
  stopped: "bg-red-500/15 text-red-400 border-red-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
};

function MetricBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const color = value > 80 ? "bg-red-500" : value > 60 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function NodeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: node, isLoading } = useQuery<NodeDetailData>({
    queryKey: ["node", id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/nodes/${id}`);
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/nodes")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Nodes
        </Button>
        <p className="text-muted-foreground">Node not found.</p>
      </div>
    );
  }

  const metrics = node.metrics ?? { cpu: 0, ram: 0, bandwidth: 0 };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate("/nodes")}>
        <ArrowLeft className="h-4 w-4" />
        Back to Nodes
      </Button>

      {/* Node info card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="h-6 w-6 text-muted-foreground" />
              <div>
                <CardTitle className="text-xl">{node.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {node.host} &middot; {node.country_code} &middot; {node.region}
                </p>
              </div>
            </div>
            <Badge className={STATUS_COLORS[node.status] ?? ""}>
              {node.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Cores status */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Xray Core
            </CardTitle>
          </CardHeader>
          <CardContent>
            {node.xray_version ? (
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{node.xray_version}</span>
                <Badge className={CORE_STATUS_COLORS[node.xray_status ?? "stopped"] ?? ""}>
                  {node.xray_status ?? "unknown"}
                </Badge>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Not installed</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sing-box Core
            </CardTitle>
          </CardHeader>
          <CardContent>
            {node.singbox_version ? (
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{node.singbox_version}</span>
                <Badge className={CORE_STATUS_COLORS[node.singbox_status ?? "stopped"] ?? ""}>
                  {node.singbox_status ?? "unknown"}
                </Badge>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Not installed</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inbounds list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inbounds</CardTitle>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Inbound
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocol</TableHead>
                <TableHead>Transport</TableHead>
                <TableHead>Security</TableHead>
                <TableHead className="text-right">Port</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!node.inbounds || node.inbounds.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    No inbounds configured.
                  </TableCell>
                </TableRow>
              ) : (
                node.inbounds.map((inbound) => (
                  <TableRow key={inbound.id}>
                    <TableCell>
                      <Badge variant="secondary">{inbound.protocol}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{inbound.transport}</TableCell>
                    <TableCell className="text-sm">{inbound.security}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {inbound.port}
                    </TableCell>
                    <TableCell className="text-right">{inbound.user_count}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          inbound.status === "active"
                            ? "bg-green-500/15 text-green-400 border-green-500/30"
                            : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                        }
                      >
                        {inbound.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Metrics Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <MetricBar label="CPU Usage" value={metrics.cpu} icon={Cpu} />
          <MetricBar label="RAM Usage" value={metrics.ram} icon={MemoryStick} />
          <MetricBar label="Bandwidth" value={metrics.bandwidth} icon={Activity} />
        </CardContent>
      </Card>

      {/* Detailed Metrics Panel */}
      {id && <MetricsPanel nodeId={id} />}
    </div>
  );
}
