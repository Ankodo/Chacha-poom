import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  Zap,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Protocol {
  id: string;
  name: string;
  shortName: string;
  description: string;
  descriptionSimple: string;
  transport: "TCP" | "UDP";
  speed: number;
  speedLabel: string;
  category: "direct" | "cdn" | "fronting";
  color: string;
  bgColor: string;
  recommended?: boolean;
  uri: string;
}

const protocols: Protocol[] = [
  {
    id: "vless-reality-xtls",
    name: "VLESS + Reality XTLS",
    shortName: "VR",
    description:
      "\u041F\u0440\u043E\u0442\u043E\u043A\u043E\u043B \u043D\u043E\u0432\u043E\u0433\u043E \u043F\u043E\u043A\u043E\u043B\u0435\u043D\u0438\u044F. \u041C\u0430\u0441\u043A\u0438\u0440\u0443\u0435\u0442 \u0442\u0440\u0430\u0444\u0438\u043A \u043F\u043E\u0434 \u043E\u0431\u044B\u0447\u043D\u044B\u0439 TLS, \u043D\u0435\u0432\u0438\u0434\u0438\u043C \u0434\u043B\u044F DPI.",
    descriptionSimple:
      "\u041B\u0443\u0447\u0448\u0438\u0439 \u0434\u043B\u044F \u0432\u0430\u0448\u0435\u0433\u043E \u0440\u0435\u0433\u0438\u043E\u043D\u0430",
    transport: "TCP",
    speed: 90,
    speedLabel: "\u0411\u044B\u0441\u0442\u0440\u044B\u0439",
    category: "direct",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    recommended: true,
    uri: "vless://abc123@server.proxyforge.io:443?type=tcp&security=reality&sni=www.google.com&flow=xtls-rprx-vision#ProxyForge-Reality",
  },
  {
    id: "vless-reality-xhttp",
    name: "VLESS + Reality XHTTP",
    shortName: "VX",
    description:
      "Reality \u0441 XHTTP \u0442\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442\u043E\u043C. \u041E\u0431\u0445\u043E\u0434\u0438\u0442 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F.",
    descriptionSimple:
      "\u0410\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u043F\u0440\u044F\u043C\u043E\u0439 \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B",
    transport: "TCP",
    speed: 85,
    speedLabel: "\u0411\u044B\u0441\u0442\u0440\u044B\u0439",
    category: "direct",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    uri: "vless://abc123@server.proxyforge.io:443?type=xhttp&security=reality&sni=www.google.com#ProxyForge-XHTTP",
  },
  {
    id: "hysteria2",
    name: "Hysteria2",
    shortName: "H2",
    description:
      "QUIC-\u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B \u0441 \u0430\u0433\u0440\u0435\u0441\u0441\u0438\u0432\u043D\u044B\u043C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u043F\u043E\u0442\u043E\u043A\u043E\u043C. \u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0434\u043B\u044F \u0441\u0442\u0440\u0438\u043C\u0438\u043D\u0433\u0430.",
    descriptionSimple:
      "\u0411\u044B\u0441\u0442\u0440\u044B\u0439 UDP \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B",
    transport: "UDP",
    speed: 100,
    speedLabel: "1 \u0413\u0431\u0438\u0442/\u0441",
    category: "direct",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    uri: "hysteria2://password@server.proxyforge.io:443?sni=example.com#ProxyForge-Hysteria2",
  },
  {
    id: "vless-ws-cdn",
    name: "VLESS + WS + CDN",
    shortName: "VW",
    description:
      "WebSocket \u0442\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442 \u0447\u0435\u0440\u0435\u0437 CDN. \u0420\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0437\u0430 \u0441\u0442\u0440\u043E\u0433\u0438\u043C\u0438 \u0444\u0430\u0435\u0440\u0432\u043E\u043B\u0430\u043C\u0438.",
    descriptionSimple:
      "\u0427\u0435\u0440\u0435\u0437 CDN \u2014 \u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u044B\u0439",
    transport: "TCP",
    speed: 70,
    speedLabel: "\u0421\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u044B\u0439",
    category: "cdn",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    uri: "vless://abc123@cdn.proxyforge.io:443?type=ws&security=tls&sni=cdn.proxyforge.io&path=/ws#ProxyForge-WS-CDN",
  },
  {
    id: "trojan-ws-cdn",
    name: "Trojan + WS + CDN",
    shortName: "TR",
    description:
      "\u041A\u043B\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043A\u0438\u0439 Trojan \u0441 CDN-\u0440\u0435\u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0446\u0438\u0435\u0439. \u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C.",
    descriptionSimple:
      "\u0427\u0435\u0440\u0435\u0437 CDN \u2014 \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439",
    transport: "TCP",
    speed: 65,
    speedLabel: "\u0425\u043E\u0440\u043E\u0448\u0438\u0439",
    category: "cdn",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    uri: "trojan://password@cdn.proxyforge.io:443?type=ws&security=tls&sni=cdn.proxyforge.io&path=/trojan#ProxyForge-Trojan-CDN",
  },
];

const appLinks = [
  {
    name: "v2rayNG",
    platform: "Android",
    url: "https://play.google.com/store/apps/details?id=com.v2ray.ang",
  },
  {
    name: "Hiddify",
    platform: "Android / iOS",
    url: "https://github.com/hiddify/hiddify-next",
  },
  {
    name: "Clash Verge",
    platform: "Windows / macOS",
    url: "https://github.com/clash-verge-rev/clash-verge-rev",
  },
  {
    name: "Shadowrocket",
    platform: "iOS",
    url: "https://apps.apple.com/app/shadowrocket/id932747118",
  },
];

export default function Protocols() {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [selected, setSelected] = useState<Protocol | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyUri = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [
    {
      key: "direct",
      label: "\u041F\u0440\u044F\u043C\u043E\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435",
    },
    { key: "cdn", label: "\u0427\u0435\u0440\u0435\u0437 CDN" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            \u041F\u0440\u043E\u0442\u043E\u043A\u043E\u043B\u044B
          </h1>
          <p className="text-sm text-muted-foreground">
            \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u043F\u0442\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F
          </p>
        </div>
        <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
          <button
            onClick={() => setMode("simple")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              mode === "simple"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            \u041F\u0440\u043E\u0441\u0442\u043E\u0439
          </button>
          <button
            onClick={() => setMode("advanced")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              mode === "advanced"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            \u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0439
          </button>
        </div>
      </div>

      {mode === "simple" ? (
        /* Simple mode: recommended cards */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {protocols
            .filter((p) => p.recommended || p.id === "hysteria2" || p.id === "vless-ws-cdn")
            .map((proto) => (
              <Card
                key={proto.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-emerald-500/30",
                  selected?.id === proto.id && "border-emerald-500 bg-emerald-500/5",
                )}
                onClick={() => setSelected(proto)}
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold",
                        proto.bgColor,
                        proto.color,
                      )}
                    >
                      {proto.shortName}
                    </div>
                    {proto.recommended && (
                      <Badge variant="success" className="text-[10px]">
                        \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C
                      </Badge>
                    )}
                  </div>
                  <h3 className="mb-1 font-semibold">{proto.name}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {proto.descriptionSimple}
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[10px]">
                      {proto.transport}
                    </Badge>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn("h-full rounded-full", proto.bgColor)}
                          style={{
                            width: `${proto.speed}%`,
                            backgroundColor:
                              proto.color === "text-emerald-400"
                                ? "#34d399"
                                : proto.color === "text-orange-400"
                                  ? "#fb923c"
                                  : proto.color === "text-blue-400"
                                    ? "#60a5fa"
                                    : "#c084fc",
                          }}
                        />
                      </div>
                      <span
                        className={cn("text-[10px] font-medium", proto.color)}
                      >
                        {proto.speedLabel}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        /* Advanced mode: full matrix */
        <div className="space-y-6">
          {categories.map((cat) => {
            const catProtos = protocols.filter((p) => p.category === cat.key);
            if (catProtos.length === 0) return null;
            return (
              <div key={cat.key}>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {cat.label}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {catProtos.map((proto) => (
                    <Card
                      key={proto.id}
                      className={cn(
                        "cursor-pointer transition-all hover:border-emerald-500/30",
                        selected?.id === proto.id &&
                          "border-emerald-500 bg-emerald-500/5",
                      )}
                      onClick={() => setSelected(proto)}
                    >
                      <CardContent className="p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold",
                                proto.bgColor,
                                proto.color,
                              )}
                            >
                              {proto.shortName}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold">
                                {proto.name}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="text-[9px]"
                                >
                                  {proto.transport}
                                </Badge>
                                <span
                                  className={cn(
                                    "text-[10px] font-medium",
                                    proto.color,
                                  )}
                                >
                                  {proto.speedLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                          {proto.recommended && (
                            <Badge variant="success" className="text-[9px]">
                              \u2605
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {proto.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Protocol Detail */}
      {selected && (
        <Card className="border-emerald-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-sm">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                    selected.bgColor,
                    selected.color,
                  )}
                >
                  {selected.shortName}
                </div>
                {selected.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(null)}
              >
                \u0417\u0430\u043A\u0440\u044B\u0442\u044C
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URI */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                URI \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438
              </label>
              <div className="flex gap-2">
                <div className="flex-1 overflow-hidden rounded-lg border border-border bg-secondary/50 px-4 py-2.5">
                  <code className="block truncate text-xs text-muted-foreground font-mono">
                    {selected.uri}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUri}
                  className="shrink-0 gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      \u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* QR Code placeholder */}
            <div className="flex items-center gap-6">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border border-border bg-white">
                <div className="text-center text-xs text-gray-400">
                  QR Code
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438
                </p>
                <div className="flex flex-wrap gap-2">
                  {appLinks.map((app) => (
                    <a
                      key={app.name}
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        {app.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </a>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  \u041E\u0442\u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0439\u0442\u0435 QR-\u043A\u043E\u0434 \u0438\u043B\u0438 \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 URI \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
