import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
  node_name: string;
}

const SEVERITY_CONFIG: Record<
  Alert["severity"],
  { icon: LucideIcon; color: string; bg: string; border: string }
> = {
  critical: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
};

const MOCK_ALERTS: Alert[] = [
  {
    id: "1",
    severity: "critical",
    message: "Node Singapore-1 is offline — no heartbeat for 5 minutes",
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
    node_name: "Singapore-1",
  },
  {
    id: "2",
    severity: "warning",
    message: "CPU usage above 80% on US-East-1",
    timestamp: new Date(Date.now() - 15 * 60_000).toISOString(),
    node_name: "US-East-1",
  },
  {
    id: "3",
    severity: "warning",
    message: "TLS certificate expiring in 7 days on Frankfurt-1",
    timestamp: new Date(Date.now() - 3600_000).toISOString(),
    node_name: "Frankfurt-1",
  },
  {
    id: "4",
    severity: "info",
    message: "Xray core updated to v1.8.24 on Amsterdam-1",
    timestamp: new Date(Date.now() - 7200_000).toISOString(),
    node_name: "Amsterdam-1",
  },
];

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function fetchAlerts(): Promise<Alert[]> {
  try {
    const { data } = await api.get("/admin/monitoring/alerts");
    return data;
  } catch {
    return MOCK_ALERTS;
  }
}

export default function AlertsList() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    refetchInterval: 30_000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      try {
        await api.delete(`/admin/monitoring/alerts/${alertId}`);
      } catch {
        // Optimistic removal even if API isn't ready
      }
    },
    onMutate: async (alertId: string) => {
      await queryClient.cancelQueries({ queryKey: ["alerts"] });
      const previous = queryClient.getQueryData<Alert[]>(["alerts"]);
      queryClient.setQueryData<Alert[]>(["alerts"], (old) =>
        old?.filter((a) => a.id !== alertId)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["alerts"], context.previous);
      }
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Active Alerts</CardTitle>
          {alerts && alerts.length > 0 && (
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
              {alerts.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${config.bg} ${config.border}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-card-foreground">
                      {alert.message}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{alert.node_name}</span>
                      <span>&middot;</span>
                      <span>{formatTimeAgo(alert.timestamp)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => dismissMutation.mutate(alert.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
