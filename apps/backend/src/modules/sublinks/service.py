"""Sub-link service — generates subscription links in multiple formats."""

import base64
import json
import uuid
from datetime import UTC, datetime

import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.user import User
from src.models.subscription import Subscription, SubStatus
from src.modules.configs.service import ConfigService


class SubLinkService:
    """Generates subscription configs in v2ray, clash, singbox, shadowrocket formats."""

    @staticmethod
    def detect_client_format(user_agent: str) -> str:
        """Auto-detect client format from User-Agent header."""
        ua = user_agent.lower()
        if "clash" in ua or "mihomo" in ua or "stash" in ua:
            return "clash"
        if "sfi" in ua or "sfa" in ua or "sing-box" in ua or "hiddify" in ua:
            return "singbox"
        if "shadowrocket" in ua:
            return "shadowrocket"
        if "outline" in ua:
            return "outline"
        # Default to v2ray (works with v2rayNG, v2rayN, Nekoray)
        return "v2ray"

    @staticmethod
    async def get_user_by_token(
        db: AsyncSession,
        token: str,
    ) -> User | None:
        """Get user by sub-link token, checking subscription validity."""
        result = await db.execute(
            select(User)
            .options(selectinload(User.subscription))
            .where(User.sub_token == token)
        )
        user = result.scalar_one_or_none()
        if not user:
            return None

        # Check subscription
        sub = user.subscription
        if not sub:
            return None

        # Check status
        if sub.status == SubStatus.DISABLED:
            return None

        # Check expiry → update status
        if sub.expiry_date < datetime.now(UTC):
            sub.status = SubStatus.EXPIRED
            await db.commit()
            return None

        # Check traffic
        if sub.traffic_limit > 0 and sub.traffic_used >= sub.traffic_limit:
            sub.status = SubStatus.LIMITED
            await db.commit()
            return None

        return user

    @staticmethod
    async def generate_sub(
        db: AsyncSession,
        token: str,
        format: str | None = None,
        user_agent: str = "",
    ) -> tuple[str, str]:
        """Generate subscription content. Returns (content, content_type)."""
        user = await SubLinkService.get_user_by_token(db, token)
        if not user:
            return "", ""

        # Detect format
        fmt = format or SubLinkService.detect_client_format(user_agent)

        # Generate configs
        configs = await ConfigService.generate_user_configs(db, user.id)
        if not configs:
            return "", ""

        if fmt == "v2ray":
            return SubLinkService._format_v2ray(configs), "text/plain"
        elif fmt == "clash":
            return SubLinkService._format_clash(configs), "text/yaml"
        elif fmt == "singbox":
            return SubLinkService._format_singbox(configs), "application/json"
        elif fmt == "shadowrocket":
            return SubLinkService._format_shadowrocket(configs), "text/plain"
        elif fmt == "outline":
            return SubLinkService._format_outline(configs), "text/plain"
        else:
            return SubLinkService._format_v2ray(configs), "text/plain"

    @staticmethod
    def _format_v2ray(configs: list[dict]) -> str:
        """V2Ray format — base64 encoded URIs, one per line."""
        uris = [c["uri"] for c in configs]
        raw = "\n".join(uris)
        return base64.b64encode(raw.encode()).decode()

    @staticmethod
    def _format_clash(configs: list[dict]) -> str:
        """Clash/Mihomo format — YAML config with proxies and proxy groups."""
        proxies = []

        for c in configs:
            uri = c["uri"]
            protocol = c["protocol"]
            remark = c["remark"]

            if protocol == "vless":
                proxy = SubLinkService._parse_vless_to_clash(uri, remark)
            elif protocol == "trojan":
                proxy = SubLinkService._parse_trojan_to_clash(uri, remark)
            elif protocol == "vmess":
                proxy = SubLinkService._parse_vmess_to_clash(uri, remark)
            elif protocol == "hysteria2":
                proxy = SubLinkService._parse_hysteria2_to_clash(uri, remark)
            else:
                continue

            if proxy:
                proxies.append(proxy)

        proxy_names = [p["name"] for p in proxies]

        clash_config = {
            "mixed-port": 7890,
            "allow-lan": False,
            "mode": "rule",
            "log-level": "info",
            "dns": {
                "enable": True,
                "enhanced-mode": "fake-ip",
                "fake-ip-range": "198.18.0.1/16",
                "nameserver": ["https://dns.google/dns-query", "https://1.1.1.1/dns-query"],
            },
            "proxies": proxies,
            "proxy-groups": [
                {
                    "name": "🚀 ProxyForge",
                    "type": "select",
                    "proxies": ["♻️ Auto", "DIRECT"] + proxy_names,
                },
                {
                    "name": "♻️ Auto",
                    "type": "url-test",
                    "proxies": proxy_names,
                    "url": "http://www.gstatic.com/generate_204",
                    "interval": 300,
                },
            ],
            "rules": [
                "GEOIP,LAN,DIRECT",
                "GEOIP,CN,DIRECT",
                "MATCH,🚀 ProxyForge",
            ],
        }

        return yaml.dump(clash_config, allow_unicode=True, default_flow_style=False)

    @staticmethod
    def _format_singbox(configs: list[dict]) -> str:
        """Sing-box format — JSON config."""
        outbounds = []

        for c in configs:
            uri = c["uri"]
            protocol = c["protocol"]
            remark = c["remark"]

            # Parse URI to sing-box outbound format
            # Using template-based approach from client templates
            from urllib.parse import urlparse, parse_qs, unquote

            if protocol == "vless":
                outbound = SubLinkService._parse_vless_to_singbox(uri, remark)
            elif protocol == "trojan":
                outbound = SubLinkService._parse_trojan_to_singbox(uri, remark)
            elif protocol == "hysteria2":
                outbound = SubLinkService._parse_hysteria2_to_singbox(uri, remark)
            else:
                continue

            if outbound:
                outbounds.append(outbound)

        outbound_names = [o["tag"] for o in outbounds]

        singbox_config = {
            "log": {"level": "info"},
            "dns": {
                "servers": [
                    {"tag": "google", "address": "https://dns.google/dns-query"},
                    {"tag": "local", "address": "local", "detour": "direct"},
                ],
                "rules": [{"outbound": "any", "server": "local"}],
            },
            "inbounds": [
                {
                    "tag": "tun-in",
                    "type": "tun",
                    "inet4_address": "172.19.0.1/30",
                    "auto_route": True,
                    "strict_route": True,
                    "sniff": True,
                }
            ],
            "outbounds": [
                {
                    "tag": "proxy",
                    "type": "selector",
                    "outbounds": ["auto"] + outbound_names + ["direct"],
                },
                {
                    "tag": "auto",
                    "type": "urltest",
                    "outbounds": outbound_names,
                    "url": "http://www.gstatic.com/generate_204",
                    "interval": "5m",
                },
                *outbounds,
                {"tag": "direct", "type": "direct"},
                {"tag": "block", "type": "block"},
            ],
            "route": {
                "auto_detect_interface": True,
                "rules": [
                    {"protocol": "dns", "outbound": "dns-out"},
                    {"geoip": ["private"], "outbound": "direct"},
                ],
            },
        }

        return json.dumps(singbox_config, ensure_ascii=False, indent=2)

    @staticmethod
    def _format_shadowrocket(configs: list[dict]) -> str:
        """Shadowrocket format — same as v2ray (base64 URIs)."""
        return SubLinkService._format_v2ray(configs)

    @staticmethod
    def _format_outline(configs: list[dict]) -> str:
        """Outline format — only ss:// URIs."""
        uris = [c["uri"] for c in configs if c["protocol"] == "shadowsocks"]
        if not uris:
            # Fallback: return all URIs
            uris = [c["uri"] for c in configs]
        return base64.b64encode("\n".join(uris).encode()).decode()

    # --- Parsers for Clash format ---
    @staticmethod
    def _parse_vless_to_clash(uri: str, remark: str) -> dict | None:
        from urllib.parse import urlparse, parse_qs
        try:
            parsed = urlparse(uri)
            params = dict(p.split("=", 1) for p in parsed.query.split("&") if "=" in p)
            proxy: dict = {
                "name": remark,
                "type": "vless",
                "server": parsed.hostname or "",
                "port": parsed.port or 443,
                "uuid": parsed.username or "",
                "udp": True,
            }
            net = params.get("type", "tcp")
            proxy["network"] = net
            security = params.get("security", "none")

            if security == "reality":
                proxy["tls"] = True
                proxy["servername"] = params.get("sni", "")
                proxy["reality-opts"] = {
                    "public-key": params.get("pbk", ""),
                    "short-id": params.get("sid", ""),
                }
                proxy["client-fingerprint"] = params.get("fp", "chrome")
                if "flow" in params:
                    proxy["flow"] = params["flow"]
            elif security == "tls":
                proxy["tls"] = True
                proxy["servername"] = params.get("sni", "")
                proxy["client-fingerprint"] = params.get("fp", "chrome")

            if net == "ws":
                proxy["ws-opts"] = {
                    "path": params.get("path", "/"),
                    "headers": {"Host": params.get("host", proxy["server"])},
                }
            elif net == "grpc":
                proxy["grpc-opts"] = {
                    "grpc-service-name": params.get("serviceName", ""),
                }

            return proxy
        except Exception:
            return None

    @staticmethod
    def _parse_trojan_to_clash(uri: str, remark: str) -> dict | None:
        from urllib.parse import urlparse
        try:
            parsed = urlparse(uri)
            params = dict(p.split("=", 1) for p in parsed.query.split("&") if "=" in p)
            proxy: dict = {
                "name": remark,
                "type": "trojan",
                "server": parsed.hostname or "",
                "port": parsed.port or 443,
                "password": parsed.username or "",
                "udp": True,
                "sni": params.get("sni", ""),
            }
            net = params.get("type", "tcp")
            if net == "ws":
                proxy["network"] = "ws"
                proxy["ws-opts"] = {
                    "path": params.get("path", "/"),
                    "headers": {"Host": params.get("host", proxy["server"])},
                }
            elif net == "grpc":
                proxy["network"] = "grpc"
                proxy["grpc-opts"] = {
                    "grpc-service-name": params.get("serviceName", ""),
                }
            return proxy
        except Exception:
            return None

    @staticmethod
    def _parse_vmess_to_clash(uri: str, remark: str) -> dict | None:
        try:
            encoded = uri.replace("vmess://", "")
            data = json.loads(base64.b64decode(encoded).decode())
            proxy: dict = {
                "name": remark,
                "type": "vmess",
                "server": data.get("add", ""),
                "port": int(data.get("port", 443)),
                "uuid": data.get("id", ""),
                "alterId": int(data.get("aid", 0)),
                "cipher": data.get("scy", "auto"),
                "udp": True,
            }
            net = data.get("net", "tcp")
            proxy["network"] = net
            if data.get("tls") == "tls":
                proxy["tls"] = True
                proxy["servername"] = data.get("sni", "")
            if net == "ws":
                proxy["ws-opts"] = {
                    "path": data.get("path", "/"),
                    "headers": {"Host": data.get("host", "")},
                }
            return proxy
        except Exception:
            return None

    @staticmethod
    def _parse_hysteria2_to_clash(uri: str, remark: str) -> dict | None:
        from urllib.parse import urlparse
        try:
            parsed = urlparse(uri)
            params = dict(p.split("=", 1) for p in parsed.query.split("&") if "=" in p)
            proxy: dict = {
                "name": remark,
                "type": "hysteria2",
                "server": parsed.hostname or "",
                "port": parsed.port or 443,
                "password": parsed.username or "",
                "sni": params.get("sni", ""),
            }
            if params.get("obfs") == "salamander":
                proxy["obfs"] = "salamander"
                proxy["obfs-password"] = params.get("obfs-password", "")
            return proxy
        except Exception:
            return None

    # --- Parsers for Sing-box format ---
    @staticmethod
    def _parse_vless_to_singbox(uri: str, remark: str) -> dict | None:
        from urllib.parse import urlparse
        try:
            parsed = urlparse(uri)
            params = dict(p.split("=", 1) for p in parsed.query.split("&") if "=" in p)
            outbound: dict = {
                "tag": remark,
                "type": "vless",
                "server": parsed.hostname or "",
                "server_port": parsed.port or 443,
                "uuid": parsed.username or "",
            }
            security = params.get("security", "none")
            net = params.get("type", "tcp")

            if "flow" in params:
                outbound["flow"] = params["flow"]

            # TLS
            tls: dict = {"enabled": True}
            if security == "reality":
                tls["server_name"] = params.get("sni", "")
                tls["utls"] = {"enabled": True, "fingerprint": params.get("fp", "chrome")}
                tls["reality"] = {
                    "enabled": True,
                    "public_key": params.get("pbk", ""),
                    "short_id": params.get("sid", ""),
                }
            elif security == "tls":
                tls["server_name"] = params.get("sni", "")
                tls["utls"] = {"enabled": True, "fingerprint": params.get("fp", "chrome")}
            else:
                tls["enabled"] = False

            if tls["enabled"]:
                outbound["tls"] = tls

            # Transport
            if net == "ws":
                outbound["transport"] = {
                    "type": "ws",
                    "path": params.get("path", "/"),
                    "headers": {"Host": params.get("host", outbound["server"])},
                }
            elif net == "grpc":
                outbound["transport"] = {
                    "type": "grpc",
                    "service_name": params.get("serviceName", ""),
                }

            return outbound
        except Exception:
            return None

    @staticmethod
    def _parse_trojan_to_singbox(uri: str, remark: str) -> dict | None:
        from urllib.parse import urlparse
        try:
            parsed = urlparse(uri)
            params = dict(p.split("=", 1) for p in parsed.query.split("&") if "=" in p)
            outbound: dict = {
                "tag": remark,
                "type": "trojan",
                "server": parsed.hostname or "",
                "server_port": parsed.port or 443,
                "password": parsed.username or "",
                "tls": {
                    "enabled": True,
                    "server_name": params.get("sni", ""),
                    "utls": {"enabled": True, "fingerprint": params.get("fp", "chrome")},
                },
            }
            net = params.get("type", "tcp")
            if net == "ws":
                outbound["transport"] = {
                    "type": "ws",
                    "path": params.get("path", "/"),
                    "headers": {"Host": params.get("host", outbound["server"])},
                }
            elif net == "grpc":
                outbound["transport"] = {
                    "type": "grpc",
                    "service_name": params.get("serviceName", ""),
                }
            return outbound
        except Exception:
            return None

    @staticmethod
    def _parse_hysteria2_to_singbox(uri: str, remark: str) -> dict | None:
        from urllib.parse import urlparse
        try:
            parsed = urlparse(uri)
            params = dict(p.split("=", 1) for p in parsed.query.split("&") if "=" in p)
            outbound: dict = {
                "tag": remark,
                "type": "hysteria2",
                "server": parsed.hostname or "",
                "server_port": parsed.port or 443,
                "password": parsed.username or "",
                "tls": {
                    "enabled": True,
                    "server_name": params.get("sni", ""),
                },
            }
            if params.get("obfs") == "salamander":
                outbound["obfs"] = {
                    "type": "salamander",
                    "password": params.get("obfs-password", ""),
                }
            return outbound
        except Exception:
            return None
