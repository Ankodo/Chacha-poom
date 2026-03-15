import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Lock,
  Globe,
  Zap,
  Eye,
  Radio,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  PROTOCOLS,
  CONNECTION_MODES,
  DEFAULT_PORTS,
  TRANSPORT_LABELS,
  SECURITY_LABELS,
  FINGERPRINT_OPTIONS,
  ALPN_OPTIONS,
  XHTTP_MODES,
  getAvailableConnectionModes,
} from "./protocol-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Node {
  id: string;
  name: string;
  host: string;
  country_code: string;
  status: "online" | "offline" | "degraded" | "maintenance";
  xray_version?: string;
  singbox_version?: string;
  region_profile?: string;
}

interface ConfigMatrix {
  [protocol: string]: {
    [transport: string]: {
      securities: string[];
      region_compat?: Record<string, "green" | "yellow" | "red">;
    };
  };
}

interface WizardState {
  nodeId: string;
  protocol: string;
  transport: string;
  security: string;
  connectionMode: string;
  cdnDomain: string;
  frontDomain: string;
  port: number;
  tag: string;
  sniffing: boolean;
  // Reality settings
  realityDest: string;
  realityServerNames: string;
  realityFingerprint: string;
  // TLS settings
  tlsCertPath: string;
  tlsKeyPath: string;
  tlsAlpn: string;
  tlsFingerprint: string;
  // WebSocket settings
  wsPath: string;
  wsHost: string;
  // gRPC settings
  grpcServiceName: string;
  // Hysteria2 settings
  hy2ObfsPassword: string;
  hy2UpMbps: number;
  hy2DownMbps: number;
  hy2IgnoreClientBandwidth: boolean;
  // XHTTP settings
  xhttpPath: string;
  xhttpMode: string;
}

const INITIAL_STATE: WizardState = {
  nodeId: "",
  protocol: "",
  transport: "",
  security: "",
  connectionMode: "direct",
  cdnDomain: "",
  frontDomain: "",
  port: 443,
  tag: "",
  sniffing: true,
  realityDest: "",
  realityServerNames: "",
  realityFingerprint: "chrome",
  tlsCertPath: "/etc/ssl/certs/cert.pem",
  tlsKeyPath: "/etc/ssl/private/key.pem",
  tlsAlpn: "h2,http/1.1",
  tlsFingerprint: "chrome",
  wsPath: "/ws",
  wsHost: "",
  grpcServiceName: "grpc",
  hy2ObfsPassword: "",
  hy2UpMbps: 100,
  hy2DownMbps: 100,
  hy2IgnoreClientBandwidth: false,
  xhttpPath: "/xhttp",
  xhttpMode: "auto",
};

const STEP_TITLES = [
  "Select Node",
  "Select Protocol",
  "Transport & Security",
  "Connection Mode",
  "Configuration",
];

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

const ICON_MAP: Record<string, React.ElementType> = {
  Shield,
  Lock,
  Globe,
  Zap,
  Eye,
  Radio,
};

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-red-500",
  degraded: "bg-yellow-500",
  maintenance: "bg-gray-500",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InboundConstructorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InboundConstructor({
  open,
  onOpenChange,
}: InboundConstructorProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({ ...INITIAL_STATE });

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(0);
      setState({ ...INITIAL_STATE });
    }
  }, [open]);

  // ---- Data fetching ----

  const { data: nodes = [], isLoading: nodesLoading } = useQuery<Node[]>({
    queryKey: ["nodes"],
    queryFn: async () => {
      const { data } = await api.get("/admin/nodes");
      return data;
    },
    enabled: open,
  });

  const { data: configMatrix } = useQuery<ConfigMatrix>({
    queryKey: ["config-matrix"],
    queryFn: async () => {
      const { data } = await api.get("/admin/configs/matrix");
      return data;
    },
    enabled: open,
  });

  // ---- Mutation ----

  const createInbound = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post("/admin/inbounds", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbounds"] });
      onOpenChange(false);
    },
  });

  // ---- Derived data ----

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === state.nodeId),
    [nodes, state.nodeId]
  );

  const nodeHasCore = useCallback(
    (core: "xray" | "singbox"): boolean => {
      if (!selectedNode) return false;
      if (core === "xray") return !!selectedNode.xray_version;
      return !!selectedNode.singbox_version;
    },
    [selectedNode]
  );

  const availableTransports = useMemo(() => {
    if (!state.protocol) return {};
    const proto = PROTOCOLS[state.protocol];
    if (!proto) return {};

    // If we have a matrix from server, prefer it
    if (configMatrix && configMatrix[state.protocol]) {
      return configMatrix[state.protocol];
    }

    // Fallback to local data
    return proto.transports;
  }, [state.protocol, configMatrix]);

  const availableSecurities = useMemo(() => {
    if (!state.transport || !availableTransports[state.transport]) return [];
    const t = availableTransports[state.transport];
    return t.securities || [];
  }, [state.transport, availableTransports]);

  const availableModes = useMemo(
    () => getAvailableConnectionModes(state.transport, state.security),
    [state.transport, state.security]
  );

  // Auto-generate tag
  useEffect(() => {
    if (state.protocol && state.transport && selectedNode) {
      const tag = `${state.protocol}-${state.transport}-${selectedNode.name.toLowerCase().replace(/\s+/g, "-")}`;
      setState((prev) => ({ ...prev, tag }));
    }
  }, [state.protocol, state.transport, selectedNode]);

  // Set default port when protocol changes
  useEffect(() => {
    if (state.protocol) {
      setState((prev) => ({
        ...prev,
        port: DEFAULT_PORTS[state.protocol] ?? 443,
      }));
    }
  }, [state.protocol]);

  // ---- Helpers ----

  const update = useCallback(
    (patch: Partial<WizardState>) =>
      setState((prev) => ({ ...prev, ...patch })),
    []
  );

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return !!state.nodeId;
      case 1:
        return !!state.protocol;
      case 2:
        return !!state.transport && !!state.security;
      case 3:
        return (
          !!state.connectionMode &&
          (state.connectionMode !== "cdn" || !!state.cdnDomain.trim()) &&
          (state.connectionMode !== "domain_fronting" ||
            !!state.frontDomain.trim())
        );
      case 4:
        return state.port > 0 && state.port <= 65535 && !!state.tag.trim();
      default:
        return false;
    }
  }, [step, state]);

  function handleNext() {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleCreate();
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleCreate() {
    const payload: Record<string, unknown> = {
      node_id: state.nodeId,
      protocol: state.protocol,
      transport: state.transport,
      security: state.security,
      port: state.port,
      tag: state.tag,
      sniffing: state.sniffing,
      connection_mode: state.connectionMode,
    };

    if (state.connectionMode === "cdn") {
      payload.cdn_domain = state.cdnDomain;
    }
    if (state.connectionMode === "domain_fronting") {
      payload.front_domain = state.frontDomain;
    }

    // Security-specific settings
    if (state.security === "reality") {
      payload.reality = {
        dest: state.realityDest,
        server_names: state.realityServerNames
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        fingerprint: state.realityFingerprint,
      };
    }
    if (state.security === "tls") {
      payload.tls = {
        cert_path: state.tlsCertPath,
        key_path: state.tlsKeyPath,
        alpn: state.tlsAlpn.split(",").map((s) => s.trim()),
        fingerprint: state.tlsFingerprint,
      };
    }

    // Transport-specific settings
    if (state.transport === "ws") {
      payload.ws = {
        path: state.wsPath,
        host: state.wsHost || undefined,
      };
    }
    if (state.transport === "grpc") {
      payload.grpc = { service_name: state.grpcServiceName };
    }
    if (state.transport === "xhttp") {
      payload.xhttp = {
        path: state.xhttpPath,
        mode: state.xhttpMode,
      };
    }

    // Protocol-specific settings
    if (state.protocol === "hysteria2") {
      payload.hysteria2 = {
        obfs_password: state.hy2ObfsPassword || undefined,
        up_mbps: state.hy2UpMbps,
        down_mbps: state.hy2DownMbps,
        ignore_client_bandwidth: state.hy2IgnoreClientBandwidth,
      };
    }

    createInbound.mutate(payload);
  }

  function getRegionCompat(
    transport: string,
    security: string
  ): "green" | "yellow" | "red" | null {
    if (
      !configMatrix ||
      !state.protocol ||
      !configMatrix[state.protocol]?.[transport]?.region_compat
    ) {
      return null;
    }
    return (
      configMatrix[state.protocol][transport].region_compat?.[security] ?? null
    );
  }

  // ---- Render steps ----

  function renderStepNode() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose a node to host this inbound configuration.
        </p>
        {nodesLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading nodes...
          </div>
        ) : nodes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No nodes available. Add a node first.
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => update({ nodeId: node.id })}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  state.nodeId === node.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-block h-2.5 w-2.5 rounded-full",
                        STATUS_DOT[node.status] ?? "bg-gray-500"
                      )}
                    />
                    <span className="text-lg">
                      {getFlag(node.country_code)}
                    </span>
                    <div>
                      <div className="font-medium text-sm">{node.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {node.host}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {node.region_profile && (
                      <Badge variant="outline" className="text-[10px]">
                        {node.region_profile}
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      {node.xray_version && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          xray
                        </Badge>
                      )}
                      {node.singbox_version && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          singbox
                        </Badge>
                      )}
                    </div>
                    {state.nodeId === node.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderStepProtocol() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select a proxy protocol for this inbound.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(PROTOCOLS).map(([key, proto]) => {
            const IconComponent = ICON_MAP[proto.icon];
            const compatible = nodeHasCore(proto.core);
            const selected = state.protocol === key;

            return (
              <button
                key={key}
                type="button"
                disabled={!compatible}
                onClick={() =>
                  update({ protocol: key, transport: "", security: "" })
                }
                className={cn(
                  "relative rounded-lg border p-4 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : compatible
                      ? "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
                      : "border-border/50 opacity-40 cursor-not-allowed"
                )}
              >
                {proto.recommended && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-amber-500/90 text-white text-[10px] px-1.5 py-0 gap-0.5">
                      <Star className="h-2.5 w-2.5" />
                      Recommended
                    </Badge>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  {IconComponent && (
                    <div
                      className={cn(
                        "rounded-md p-2",
                        selected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{proto.name}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {proto.core}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {proto.description}
                    </p>
                  </div>
                </div>
                {selected && (
                  <Check className="absolute top-3 right-3 h-4 w-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStepTransport() {
    const transports = Object.keys(availableTransports);

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose the transport layer and security for this protocol.
        </p>

        {/* Transport selection */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Transport
          </label>
          <div className="grid grid-cols-3 gap-2">
            {transports.map((t) => {
              const selected = state.transport === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ transport: t, security: "" })}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary text-primary"
                      : "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
                  )}
                >
                  {TRANSPORT_LABELS[t] ?? t.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Security selection */}
        {state.transport && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Security
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableSecurities.map((s) => {
                const selected = state.security === s;
                const compat = getRegionCompat(state.transport, s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update({ security: s })}
                    className={cn(
                      "relative rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary text-primary"
                        : "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
                    )}
                  >
                    {SECURITY_LABELS[s] ?? s}
                    {compat && (
                      <div className="mt-1">
                        <RegionBadge compat={compat} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Region compatibility summary */}
        {state.transport && state.security && (
          <RegionCompatSummary
            compat={getRegionCompat(state.transport, state.security)}
          />
        )}
      </div>
    );
  }

  function renderStepConnectionMode() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose how clients will connect to this inbound.
        </p>
        <div className="space-y-2">
          {availableModes.map((modeKey) => {
            const mode = CONNECTION_MODES[modeKey];
            if (!mode) return null;
            const selected = state.connectionMode === modeKey;

            return (
              <div key={modeKey} className="space-y-2">
                <button
                  type="button"
                  onClick={() => update({ connectionMode: modeKey })}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{mode.name}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {mode.description}
                      </p>
                    </div>
                    {selected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                </button>

                {/* Input fields for CDN / Domain Fronting */}
                {selected && mode.hasInput && (
                  <div className="pl-4">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      {mode.inputLabel}
                    </label>
                    <Input
                      value={
                        modeKey === "cdn"
                          ? state.cdnDomain
                          : state.frontDomain
                      }
                      onChange={(e) =>
                        update(
                          modeKey === "cdn"
                            ? { cdnDomain: e.target.value }
                            : { frontDomain: e.target.value }
                        )
                      }
                      placeholder={mode.inputPlaceholder}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStepConfig() {
    return (
      <div className="space-y-5 max-h-[400px] overflow-y-auto pr-1">
        {/* Port & Tag */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Port
            </label>
            <Input
              type="number"
              min={1}
              max={65535}
              value={state.port}
              onChange={(e) => update({ port: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Tag
            </label>
            <Input
              value={state.tag}
              onChange={(e) => update({ tag: e.target.value })}
              placeholder="inbound-tag"
            />
          </div>
        </div>

        {/* Sniffing toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <div className="text-sm font-medium">Sniffing</div>
            <div className="text-xs text-muted-foreground">
              Detect and route by domain name
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.sniffing}
            onClick={() => update({ sniffing: !state.sniffing })}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              state.sniffing ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                state.sniffing ? "translate-x-[18px]" : "translate-x-[2px]"
              )}
            />
          </button>
        </div>

        {/* Reality settings */}
        {state.security === "reality" && (
          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Reality Settings
            </legend>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Destination Domain
              </label>
              <Input
                value={state.realityDest}
                onChange={(e) => update({ realityDest: e.target.value })}
                placeholder="www.google.com:443"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Server Names (comma-separated)
              </label>
              <Input
                value={state.realityServerNames}
                onChange={(e) =>
                  update({ realityServerNames: e.target.value })
                }
                placeholder="www.google.com, google.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Fingerprint
              </label>
              <select
                value={state.realityFingerprint}
                onChange={(e) =>
                  update({ realityFingerprint: e.target.value })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {FINGERPRINT_OPTIONS.map((fp) => (
                  <option
                    key={fp}
                    value={fp}
                    className="bg-popover text-popover-foreground"
                  >
                    {fp}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        )}

        {/* TLS settings */}
        {state.security === "tls" && (
          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              TLS Settings
            </legend>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Certificate Path
              </label>
              <Input
                value={state.tlsCertPath}
                onChange={(e) => update({ tlsCertPath: e.target.value })}
                placeholder="/etc/ssl/certs/cert.pem"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Key Path
              </label>
              <Input
                value={state.tlsKeyPath}
                onChange={(e) => update({ tlsKeyPath: e.target.value })}
                placeholder="/etc/ssl/private/key.pem"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                ALPN
              </label>
              <select
                value={state.tlsAlpn}
                onChange={(e) => update({ tlsAlpn: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ALPN_OPTIONS.map((alpn) => (
                  <option
                    key={alpn}
                    value={alpn}
                    className="bg-popover text-popover-foreground"
                  >
                    {alpn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Fingerprint
              </label>
              <select
                value={state.tlsFingerprint}
                onChange={(e) => update({ tlsFingerprint: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {FINGERPRINT_OPTIONS.map((fp) => (
                  <option
                    key={fp}
                    value={fp}
                    className="bg-popover text-popover-foreground"
                  >
                    {fp}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        )}

        {/* WebSocket settings */}
        {state.transport === "ws" && (
          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              WebSocket Settings
            </legend>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Path
              </label>
              <Input
                value={state.wsPath}
                onChange={(e) => update({ wsPath: e.target.value })}
                placeholder="/ws"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Host Header
              </label>
              <Input
                value={state.wsHost}
                onChange={(e) => update({ wsHost: e.target.value })}
                placeholder="example.com (optional)"
              />
            </div>
          </fieldset>
        )}

        {/* gRPC settings */}
        {state.transport === "grpc" && (
          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              gRPC Settings
            </legend>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Service Name
              </label>
              <Input
                value={state.grpcServiceName}
                onChange={(e) =>
                  update({ grpcServiceName: e.target.value })
                }
                placeholder="grpc"
              />
            </div>
          </fieldset>
        )}

        {/* XHTTP settings */}
        {state.transport === "xhttp" && (
          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              XHTTP Settings
            </legend>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Path
              </label>
              <Input
                value={state.xhttpPath}
                onChange={(e) => update({ xhttpPath: e.target.value })}
                placeholder="/xhttp"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Mode
              </label>
              <select
                value={state.xhttpMode}
                onChange={(e) => update({ xhttpMode: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {XHTTP_MODES.map((mode) => (
                  <option
                    key={mode}
                    value={mode}
                    className="bg-popover text-popover-foreground"
                  >
                    {mode}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        )}

        {/* Hysteria2 settings */}
        {state.protocol === "hysteria2" && (
          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Hysteria2 Settings
            </legend>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Obfuscation Password
              </label>
              <Input
                value={state.hy2ObfsPassword}
                onChange={(e) =>
                  update({ hy2ObfsPassword: e.target.value })
                }
                placeholder="Leave empty to disable obfuscation"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Upload (Mbps)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={state.hy2UpMbps}
                  onChange={(e) =>
                    update({ hy2UpMbps: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Download (Mbps)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={state.hy2DownMbps}
                  onChange={(e) =>
                    update({ hy2DownMbps: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">
                  Ignore Client Bandwidth
                </div>
                <div className="text-xs text-muted-foreground">
                  Override client-reported bandwidth settings
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={state.hy2IgnoreClientBandwidth}
                onClick={() =>
                  update({
                    hy2IgnoreClientBandwidth: !state.hy2IgnoreClientBandwidth,
                  })
                }
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  state.hy2IgnoreClientBandwidth ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                    state.hy2IgnoreClientBandwidth
                      ? "translate-x-[18px]"
                      : "translate-x-[2px]"
                  )}
                />
              </button>
            </div>
          </fieldset>
        )}
      </div>
    );
  }

  // ---- Main render ----

  const stepRenderers = [
    renderStepNode,
    renderStepProtocol,
    renderStepTransport,
    renderStepConnectionMode,
    renderStepConfig,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Inbound</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEP_TITLES.length} &mdash;{" "}
            {STEP_TITLES[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-1">
          {STEP_TITLES.map((title, i) => (
            <div key={title} className="flex items-center flex-1">
              <div
                className={cn(
                  "h-1.5 w-full rounded-full transition-colors",
                  i < step
                    ? "bg-primary"
                    : i === step
                      ? "bg-primary/50"
                      : "bg-muted"
                )}
              />
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-hidden py-2">
          {stepRenderers[step]()}
        </div>

        {/* Error display */}
        {createInbound.isError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {(createInbound.error as Error)?.message ??
              "Failed to create inbound. Please try again."}
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="text-xs text-muted-foreground">
            {step + 1} of {STEP_TITLES.length}
          </div>

          {step < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed || createInbound.isPending}
            >
              {createInbound.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Inbound
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RegionBadge({ compat }: { compat: "green" | "yellow" | "red" }) {
  if (compat === "green") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Works
      </span>
    );
  }
  if (compat === "yellow") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-yellow-400">
        <AlertTriangle className="h-2.5 w-2.5" />
        May have issues
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-red-400">
      <XCircle className="h-2.5 w-2.5" />
      Not recommended
    </span>
  );
}

function RegionCompatSummary({
  compat,
}: {
  compat: "green" | "yellow" | "red" | null;
}) {
  if (!compat) return null;

  const config = {
    green: {
      border: "border-green-500/30",
      bg: "bg-green-500/5",
      text: "text-green-400",
      icon: CheckCircle2,
      label: "Works in your region",
      desc: "This combination is known to work reliably in the selected node's region.",
    },
    yellow: {
      border: "border-yellow-500/30",
      bg: "bg-yellow-500/5",
      text: "text-yellow-400",
      icon: AlertTriangle,
      label: "May have issues in your region",
      desc: "This combination may experience intermittent connectivity issues in some networks.",
    },
    red: {
      border: "border-red-500/30",
      bg: "bg-red-500/5",
      text: "text-red-400",
      icon: XCircle,
      label: "Not recommended for your region",
      desc: "This combination is known to be blocked or unreliable in the selected node's region.",
    },
  }[compat];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 flex items-start gap-2.5",
        config.border,
        config.bg
      )}
    >
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.text)} />
      <div>
        <div className={cn("text-sm font-medium", config.text)}>
          {config.label}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{config.desc}</p>
      </div>
    </div>
  );
}
