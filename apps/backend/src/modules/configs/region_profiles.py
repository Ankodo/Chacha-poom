"""Regional profiles — presets for different censorship environments."""

REGION_PROFILES = {
    "moscow": {
        "name": "Москва",
        "description": "Все протоколы включая UDP-based",
        "recommended": [
            "vless-reality-xtls",
            "vless-reality-xhttp",
            "hysteria2",
            "vless-ws-tls-cdn",
        ],
        "avoid": [],
        "fallback": ["vless-reality-xtls", "trojan-ws-tls-cdn"],
        "notes": "Hysteria2 работает стабильно на большинстве провайдеров",
    },
    "russia-regions": {
        "name": "Регионы РФ (Тверь, Торжок, Курск и т.д.)",
        "description": "Только TCP-based протоколы, UDP нестабилен",
        "recommended": [
            "vless-reality-xtls",
            "vless-reality-xhttp",
            "vless-ws-tls-cdn",
        ],
        "avoid": ["hysteria2", "tuic", "wireguard"],
        "fallback": ["trojan-ws-tls-cdn", "vmess-ws-tls-cdn"],
        "notes": "UDP-порты часто блокируются. Hysteria2 работает нестабильно. Только TCP!",
    },
    "china": {
        "name": "Китай (GFW)",
        "description": "Reality + ShadowTLS, без plain TLS",
        "recommended": [
            "vless-reality-xtls",
            "vless-reality-xhttp",
            "shadowsocks-shadowtls",
        ],
        "avoid": ["vmess-ws-tls", "trojan-tcp-tls"],
        "fallback": ["trojan-ws-tls-cdn"],
        "notes": "Reality-Vision framework (Xray v26.2.4+). MTU 1350 для мобильных сетей",
    },
    "iran": {
        "name": "Иран",
        "description": "Reality + Hysteria2, Fragment для некоторых ISP",
        "recommended": [
            "vless-reality-xtls",
            "hysteria2",
            "vless-ws-tls-cdn",
        ],
        "avoid": [],
        "fallback": ["trojan-grpc-tls"],
        "notes": "Fragment нужен для некоторых ISP",
    },
    "universal": {
        "name": "Универсальный",
        "description": "Базовый набор для большинства регионов",
        "recommended": [
            "vless-reality-xtls",
            "vless-ws-tls-cdn",
            "hysteria2",
        ],
        "avoid": [],
        "fallback": ["trojan-ws-tls-cdn"],
        "notes": "",
    },
}

# Full config matrix — which protocol+transport+security combos are valid
CONFIG_MATRIX = [
    # VLESS configs (Xray)
    {
        "protocol": "vless", "transport": "tcp", "security": "reality",
        "connection_modes": ["direct"], "core": "xray",
        "template": "vless-reality-xtls",
        "region_support": {
            "moscow": "recommended", "russia-regions": "recommended",
            "china": "recommended", "iran": "recommended", "universal": "recommended",
        },
    },
    {
        "protocol": "vless", "transport": "xhttp", "security": "reality",
        "connection_modes": ["direct"], "core": "xray",
        "template": "vless-reality-xhttp",
        "region_support": {
            "moscow": "recommended", "russia-regions": "recommended",
            "china": "recommended", "iran": "available", "universal": "available",
        },
    },
    {
        "protocol": "vless", "transport": "ws", "security": "tls",
        "connection_modes": ["direct", "cdn", "domain-fronting"], "core": "xray",
        "template": "vless-ws-tls-cdn",
        "region_support": {
            "moscow": "recommended", "russia-regions": "recommended",
            "china": "available", "iran": "recommended", "universal": "recommended",
        },
    },
    {
        "protocol": "vless", "transport": "grpc", "security": "tls",
        "connection_modes": ["direct", "cdn"], "core": "xray",
        "template": "vless-grpc-tls",
        "region_support": {
            "moscow": "available", "russia-regions": "available",
            "china": "available", "iran": "available", "universal": "available",
        },
    },
    {
        "protocol": "vless", "transport": "grpc", "security": "reality",
        "connection_modes": ["direct"], "core": "xray",
        "template": "vless-reality-grpc",
        "region_support": {
            "moscow": "available", "russia-regions": "available",
            "china": "available", "iran": "available", "universal": "available",
        },
    },
    # Trojan configs (Xray)
    {
        "protocol": "trojan", "transport": "ws", "security": "tls",
        "connection_modes": ["direct", "cdn", "domain-fronting"], "core": "xray",
        "template": "trojan-ws-tls-cdn",
        "region_support": {
            "moscow": "available", "russia-regions": "available",
            "china": "available", "iran": "available", "universal": "available",
        },
    },
    {
        "protocol": "trojan", "transport": "grpc", "security": "tls",
        "connection_modes": ["direct", "cdn"], "core": "xray",
        "template": "trojan-grpc-tls",
        "region_support": {
            "moscow": "available", "russia-regions": "available",
            "china": "available", "iran": "available", "universal": "available",
        },
    },
    # VMess configs (Xray)
    {
        "protocol": "vmess", "transport": "ws", "security": "tls",
        "connection_modes": ["direct", "cdn", "domain-fronting"], "core": "xray",
        "template": "vmess-ws-tls-cdn",
        "region_support": {
            "moscow": "available", "russia-regions": "available",
            "china": "avoid", "iran": "available", "universal": "available",
        },
    },
    # Hysteria2 (Sing-box)
    {
        "protocol": "hysteria2", "transport": "quic", "security": "tls",
        "connection_modes": ["direct"], "core": "singbox",
        "template": "hysteria2",
        "region_support": {
            "moscow": "recommended", "russia-regions": "avoid",
            "china": "available", "iran": "recommended", "universal": "recommended",
        },
    },
    # TUIC (Sing-box)
    {
        "protocol": "tuic", "transport": "quic", "security": "tls",
        "connection_modes": ["direct"], "core": "singbox",
        "template": "tuic",
        "region_support": {
            "moscow": "available", "russia-regions": "avoid",
            "china": "available", "iran": "available", "universal": "available",
        },
    },
    # Shadowsocks (Sing-box)
    {
        "protocol": "shadowsocks", "transport": "tcp", "security": "tls",
        "connection_modes": ["direct"], "core": "singbox",
        "template": "shadowsocks-shadowtls",
        "region_support": {
            "moscow": "available", "russia-regions": "available",
            "china": "recommended", "iran": "available", "universal": "available",
        },
    },
]
