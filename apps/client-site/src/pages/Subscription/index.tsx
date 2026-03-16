import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Clock,
  Activity,
  Server,
  ArrowRight,
} from "lucide-react";

const appLinks = [
  {
    name: "v2rayNG",
    platform: "Android",
    icon: "\uD83E\uDD16",
    deepLink: "v2rayng://install-sub?url=",
    storeUrl: "https://play.google.com/store/apps/details?id=com.v2ray.ang",
  },
  {
    name: "Hiddify",
    platform: "Android / iOS",
    icon: "\uD83D\uDCF1",
    deepLink: "hiddify://import/",
    storeUrl: "https://github.com/hiddify/hiddify-next",
  },
  {
    name: "Clash Verge",
    platform: "Windows / macOS",
    icon: "\uD83D\uDCBB",
    deepLink: "clash://install-config?url=",
    storeUrl: "https://github.com/clash-verge-rev/clash-verge-rev",
  },
  {
    name: "Shadowrocket",
    platform: "iOS",
    icon: "\uD83D\uDE80",
    deepLink: "sub://",
    storeUrl: "https://apps.apple.com/app/shadowrocket/id932747118",
  },
];

export default function Subscription() {
  const { token } = useParams<{ token: string }>();
  const [copied, setCopied] = useState(false);

  const subLink = `${window.location.origin}/api/sub/${token}`;

  // Mock subscription data
  const subscription = {
    plan: "\u041C\u0435\u0441\u044F\u0447\u043D\u044B\u0439",
    status: "active" as const,
    expiresAt: "2026-04-15",
    trafficUsed: 45.2,
    trafficLimit: 0,
    devicesUsed: 2,
    devicesLimit: 3,
  };

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(subscription.expiresAt).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(subLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Nav */}
      <nav className="border-b border-border bg-[hsl(var(--background))]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            <span className="text-lg font-extrabold tracking-tight">
              ProxyForge
            </span>
          </Link>
          <Badge variant="success" className="text-xs">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
            \u0410\u043A\u0442\u0438\u0432\u043D\u0430
          </Badge>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            \u0412\u0430\u0448\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            \u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0435 \u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F
          </p>
        </div>

        {/* Subscription Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              \u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    \u0421\u0442\u0430\u0442\u0443\u0441
                  </p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {subscription.status === "active"
                      ? "\u0410\u043A\u0442\u0438\u0432\u043D\u0430"
                      : "\u0418\u0441\u0442\u0435\u043A\u043B\u0430"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    \u0422\u0430\u0440\u0438\u0444
                  </p>
                  <p className="text-sm font-semibold">{subscription.plan}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C
                  </p>
                  <p className="text-sm font-semibold">
                    {daysLeft} \u0434\u043D.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    \u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430
                  </p>
                  <p className="text-sm font-semibold">
                    {subscription.devicesUsed} / {subscription.devicesLimit}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sub Link */}
        <Card className="border-emerald-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              \u0421\u0441\u044B\u043B\u043A\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1 overflow-hidden rounded-lg border border-border bg-secondary/50 px-4 py-2.5">
                <code className="block truncate text-sm text-muted-foreground font-mono">
                  {subLink}
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
              \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u044D\u0442\u0443 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432 VPN-\u043A\u043B\u0438\u0435\u043D\u0442 \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438. \u0421\u0441\u044B\u043B\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.
            </p>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">QR-\u043A\u043E\u0434</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="flex h-48 w-48 items-center justify-center rounded-lg border border-border bg-white">
              <span className="text-sm text-gray-400">
                QR Code
              </span>
            </div>
          </CardContent>
        </Card>

        {/* App Buttons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" />
              \u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-xs text-muted-foreground">
              \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438 \u0438\u043B\u0438 \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432\u0440\u0443\u0447\u043D\u0443\u044E
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {appLinks.map((app) => (
                <a
                  key={app.name}
                  href={`${app.deepLink}${encodeURIComponent(subLink)}`}
                  className="group flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3 transition-colors hover:border-emerald-500/30 hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{app.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{app.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {app.platform}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {appLinks.map((app) => (
                <a
                  key={app.name}
                  href={app.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    \u0421\u043A\u0430\u0447\u0430\u0442\u044C {app.name}
                  </Button>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer link */}
        <div className="text-center">
          <Link to="/purchase">
            <Button variant="outline" size="sm" className="gap-2">
              <Shield className="h-4 w-4" />
              \u041F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
