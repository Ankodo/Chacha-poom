export interface TransportConfig {
  securities: Array<"tls" | "reality" | "none">;
}

export interface ProtocolConfig {
  name: string;
  core: "xray" | "singbox";
  icon: string;
  description: string;
  recommended: boolean;
  transports: Record<string, TransportConfig>;
}

export const PROTOCOLS: Record<string, ProtocolConfig> = {
  vless: {
    name: "VLESS",
    core: "xray",
    icon: "Shield",
    description: "Lightweight protocol with Reality support",
    recommended: true,
    transports: {
      tcp: { securities: ["reality", "tls"] },
      ws: { securities: ["tls"] },
      grpc: { securities: ["tls", "reality"] },
      xhttp: { securities: ["reality"] },
      h2: { securities: ["tls"] },
    },
  },
  trojan: {
    name: "Trojan",
    core: "xray",
    icon: "Lock",
    description: "TLS-based protocol that mimics HTTPS traffic",
    recommended: false,
    transports: {
      tcp: { securities: ["tls"] },
      ws: { securities: ["tls"] },
      grpc: { securities: ["tls"] },
      h2: { securities: ["tls"] },
    },
  },
  vmess: {
    name: "VMess",
    core: "xray",
    icon: "Globe",
    description: "V2Ray legacy protocol with AES encryption",
    recommended: false,
    transports: {
      tcp: { securities: ["tls", "none"] },
      ws: { securities: ["tls", "none"] },
      grpc: { securities: ["tls"] },
      h2: { securities: ["tls"] },
      quic: { securities: ["tls"] },
    },
  },
  hysteria2: {
    name: "Hysteria2",
    core: "singbox",
    icon: "Zap",
    description: "QUIC-based protocol with congestion control",
    recommended: false,
    transports: {
      quic: { securities: ["tls"] },
    },
  },
  shadowsocks: {
    name: "Shadowsocks",
    core: "singbox",
    icon: "Eye",
    description: "Lightweight encrypted SOCKS5 proxy",
    recommended: false,
    transports: {
      tcp: { securities: ["none"] },
    },
  },
  tuic: {
    name: "TUIC",
    core: "singbox",
    icon: "Radio",
    description: "QUIC-based protocol with UDP relay support",
    recommended: false,
    transports: {
      quic: { securities: ["tls"] },
    },
  },
};

export interface ConnectionModeConfig {
  name: string;
  description: string;
  hasInput: boolean;
  inputLabel: string;
  inputPlaceholder: string;
}

export const CONNECTION_MODES: Record<string, ConnectionModeConfig> = {
  direct: {
    name: "Direct",
    description: "Connect directly to the node IP address",
    hasInput: false,
    inputLabel: "",
    inputPlaceholder: "",
  },
  cdn: {
    name: "CDN",
    description: "Route traffic through a CDN provider (e.g. Cloudflare)",
    hasInput: true,
    inputLabel: "CDN Domain",
    inputPlaceholder: "cdn.example.com",
  },
  domain_fronting: {
    name: "Domain Fronting",
    description: "Use a front domain to disguise the real destination",
    hasInput: true,
    inputLabel: "Front Domain",
    inputPlaceholder: "front.example.com",
  },
};

/** Which connection modes are available per transport+security combo */
export function getAvailableConnectionModes(
  transport: string,
  security: string
): string[] {
  // CDN only works with WebSocket and gRPC over TLS
  // Domain fronting only works with WebSocket over TLS
  // Direct always available
  const modes = ["direct"];

  if (security === "tls") {
    if (transport === "ws" || transport === "grpc") {
      modes.push("cdn");
    }
    if (transport === "ws") {
      modes.push("domain_fronting");
    }
  }

  return modes;
}

export const DEFAULT_PORTS: Record<string, number> = {
  vless: 443,
  trojan: 443,
  vmess: 443,
  hysteria2: 443,
  shadowsocks: 8388,
  tuic: 443,
};

export const TRANSPORT_LABELS: Record<string, string> = {
  tcp: "TCP",
  ws: "WebSocket",
  grpc: "gRPC",
  h2: "HTTP/2",
  quic: "QUIC",
  xhttp: "XHTTP",
};

export const SECURITY_LABELS: Record<string, string> = {
  tls: "TLS",
  reality: "Reality",
  none: "None",
};

export const FINGERPRINT_OPTIONS = [
  "chrome",
  "firefox",
  "safari",
  "random",
  "ios",
  "android",
  "edge",
  "360",
  "qq",
] as const;

export const ALPN_OPTIONS = ["h2", "http/1.1", "h2,http/1.1"] as const;

export const XHTTP_MODES = ["auto", "packet", "stream"] as const;
