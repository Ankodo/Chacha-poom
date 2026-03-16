import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Copy,
  Check,
  Shield,
  Server,
  Clock,
  Activity,
  ArrowRight,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mockConnections = [
  {
    id: 1,
    protocol: "VLESS Reality",
    server: "Frankfurt",
    flag: "\uD83C\uDDE9\uD83C\uDDEA",
    time: "2 \u043C\u0438\u043D\u0443\u0442\u044B \u043D\u0430\u0437\u0430\u0434",
    status: "active",
  },
  {
    id: 2,
    protocol: "Hysteria2",
    server: "Amsterdam",
    flag: "\uD83C\uDDF3\uD83C\uDDF1",
    time: "1 \u0447\u0430\u0441 \u043D\u0430\u0437\u0430\u0434",
    status: "closed",
  },
  {
    id: 3,
    protocol: "VLESS WS+CDN",
    server: "Helsinki",
    flag: "\uD83C\uDDEB\uD83C\uDDEE",
    time: "3 \u0447\u0430\u0441\u0430 \u043D\u0430\u0437\u0430\u0434",
    status: "closed",
  },
];

export default function Console() {
  const subscription = useAuthStore((s) => s.subscription);
  const [copied, setCopied] = useState(false);

  const sub = subscription ?? {
    plan: "Monthly",
    status: "active" as const,
    expiresAt: "2026-04-15T00:00:00Z",
    trafficUsed: 45.2,
    trafficLimit: 0,
    devicesUsed: 2,
    devicesLimit: 3,
    subLink: "https://sub.proxyforge.io/api/sub/abc123def456",
  };

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sub.subLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          \u041E\u0431\u0437\u043E\u0440
        </h1>
        <p className="text-sm text-muted-foreground">
          \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u043E\u0439 \u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F\u043C\u0438
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  \u0421\u0442\u0430\u0442\u0443\u0441
                </p>
                <div className="mt-2">
                  <Badge
                    variant={sub.status === "active" ? "success" : "destructive"}
                    className="text-xs"
                  >
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                    {sub.status === "active"
                      ? "\u0410\u043A\u0442\u0438\u0432\u043D\u0430"
                      : "\u0418\u0441\u0442\u0435\u043A\u043B\u0430"}
                  </Badge>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  \u0422\u0430\u0440\u0438\u0444
                </p>
                <p className="mt-2 text-lg font-bold">{sub.plan}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0434\u043D\u0435\u0439
                </p>
                <p className="mt-2 text-lg font-bold">{daysLeft}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  \u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430
                </p>
                <p className="mt-2 text-lg font-bold">
                  {sub.devicesUsed}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {sub.devicesLimit}
                  </span>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <Server className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic and Expiry */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              \u0422\u0440\u0430\u0444\u0438\u043A
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043E
                </span>
                <span className="font-medium">
                  {sub.trafficUsed.toFixed(1)} \u0413\u0411
                  {sub.trafficLimit > 0
                    ? ` / ${sub.trafficLimit} \u0413\u0411`
                    : " / \u0411\u0435\u0437\u043B\u0438\u043C\u0438\u0442"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${sub.trafficLimit > 0 ? Math.min(100, (sub.trafficUsed / sub.trafficLimit) * 100) : 45}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  \u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430
                </span>
                <span className="font-medium">
                  {sub.devicesUsed} / {sub.devicesLimit}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${(sub.devicesUsed / sub.devicesLimit) * 100}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              \u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link to="/console/protocols">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  size="sm"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    \u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/console/servers">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  size="sm"
                >
                  <span className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-blue-400" />
                    \u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0441\u0435\u0440\u0432\u0435\u0440
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/purchase">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  size="sm"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    \u041F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub Link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            \u0421\u0441\u044B\u043B\u043A\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1 overflow-hidden rounded-lg border border-border bg-secondary/50 px-4 py-2.5">
              <code className="block truncate text-sm text-muted-foreground">
                {sub.subLink}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0 gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  \u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C
                </>
              )}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u044D\u0442\u0443 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432 VPN-\u043A\u043B\u0438\u0435\u043D\u0442 \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0432\u0441\u0435\u0445 \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B\u043E\u0432 \u0438 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432.
          </p>
        </CardContent>
      </Card>

      {/* Recent Connections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            \u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      conn.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    <Wifi className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{conn.protocol}</p>
                    <p className="text-xs text-muted-foreground">
                      {conn.flag} {conn.server}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      conn.status === "active" ? "success" : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {conn.status === "active"
                      ? "\u0410\u043A\u0442\u0438\u0432\u043D\u043E"
                      : "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E"}
                  </Badge>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {conn.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
