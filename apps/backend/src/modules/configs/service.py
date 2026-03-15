"""Config Generator — generates server/client configs for inbounds & users."""

import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.inbound import Inbound
from src.models.node import Node
from src.models.user import User
from src.models.user_access import UserAccess
from src.modules.configs.region_profiles import CONFIG_MATRIX, REGION_PROFILES


class ConfigService:
    """Generates proxy configs for server and client sides."""

    @staticmethod
    def get_config_matrix() -> list[dict]:
        """Return the full config matrix with region support info."""
        return CONFIG_MATRIX

    @staticmethod
    def get_region_profiles() -> dict:
        """Return all region profiles."""
        return REGION_PROFILES

    @staticmethod
    def render_template(template: str, variables: dict[str, Any]) -> str:
        """Replace {{PLACEHOLDER}} in template string with actual values."""
        result = template
        for key, value in variables.items():
            placeholder = "{{" + key + "}}"
            if isinstance(value, list):
                import json
                result = result.replace(placeholder, json.dumps(value))
            elif isinstance(value, bool):
                result = result.replace(placeholder, "true" if value else "false")
            elif isinstance(value, (int, float)):
                result = result.replace(placeholder, str(value))
            else:
                result = result.replace(placeholder, str(value))
        return result

    @staticmethod
    def generate_client_uri(
        protocol: str,
        user_uuid: str,
        node: Node,
        inbound: Inbound,
    ) -> str:
        """Generate a client URI for a specific protocol+transport+security combo."""
        transport_config = inbound.transport_config or {}
        transport_type = transport_config.get("type", "tcp")
        security = transport_config.get("security", "none")
        host = node.host
        port = inbound.port

        if protocol == "vless":
            return ConfigService._generate_vless_uri(
                user_uuid, host, port, transport_type, security, transport_config, node, inbound
            )
        elif protocol == "trojan":
            return ConfigService._generate_trojan_uri(
                user_uuid, host, port, transport_type, security, transport_config, node, inbound
            )
        elif protocol == "vmess":
            return ConfigService._generate_vmess_uri(
                user_uuid, host, port, transport_type, security, transport_config, node, inbound
            )
        elif protocol == "hysteria2":
            return ConfigService._generate_hysteria2_uri(
                user_uuid, host, port, transport_config, node, inbound
            )
        else:
            return f"{protocol}://{user_uuid}@{host}:{port}#{node.name}"

    @staticmethod
    def _generate_vless_uri(
        user_uuid: str, host: str, port: int,
        transport_type: str, security: str,
        tc: dict, node: Node, inbound: Inbound,
    ) -> str:
        params = [f"type={transport_type}", f"security={security}"]

        if security == "reality":
            rs = tc.get("realitySettings", {})
            server_names = rs.get("serverNames", [])
            sni = server_names[0] if server_names else ""
            short_ids = rs.get("shortIds", [""])
            params.extend([
                f"sni={sni}",
                f"fp={tc.get('fingerprint', 'chrome')}",
                f"pbk={rs.get('publicKey', '')}",
                f"sid={short_ids[0] if short_ids else ''}",
            ])
            if transport_type == "tcp":
                params.append("flow=xtls-rprx-vision")
        elif security == "tls":
            tls_s = tc.get("tlsSettings", {})
            sni = tls_s.get("serverName", node.cdn_domain or host)
            params.extend([
                f"sni={sni}",
                f"fp={tls_s.get('fingerprint', 'chrome')}",
            ])

        if transport_type == "ws":
            ws = tc.get("wsSettings", {})
            params.append(f"path={ws.get('path', '/ws')}")
            headers = ws.get("headers", {})
            if "Host" in headers:
                params.append(f"host={headers['Host']}")
        elif transport_type == "grpc":
            grpc = tc.get("grpcSettings", {})
            params.append(f"serviceName={grpc.get('serviceName', 'grpc')}")
        elif transport_type == "xhttp":
            xhttp = tc.get("xhttpSettings", {})
            params.append(f"path={xhttp.get('path', '/')}")
            params.append(f"mode={xhttp.get('mode', 'auto')}")

        # For CDN mode, use CDN domain as the host in URI
        connect_host = host
        if inbound.connection_mode.value in ("cdn", "domain-fronting") and node.cdn_domain:
            connect_host = node.cdn_domain

        remark = f"{node.flag} {node.name}"
        return f"vless://{user_uuid}@{connect_host}:{port}?{'&'.join(params)}#{remark}"

    @staticmethod
    def _generate_trojan_uri(
        user_uuid: str, host: str, port: int,
        transport_type: str, security: str,
        tc: dict, node: Node, inbound: Inbound,
    ) -> str:
        params = [f"type={transport_type}", f"security={security}"]

        if security == "tls":
            tls_s = tc.get("tlsSettings", {})
            sni = tls_s.get("serverName", node.cdn_domain or host)
            params.extend([
                f"sni={sni}",
                f"fp={tls_s.get('fingerprint', 'chrome')}",
            ])

        if transport_type == "ws":
            ws = tc.get("wsSettings", {})
            params.append(f"path={ws.get('path', '/ws')}")
            headers = ws.get("headers", {})
            if "Host" in headers:
                params.append(f"host={headers['Host']}")
        elif transport_type == "grpc":
            grpc = tc.get("grpcSettings", {})
            params.append(f"serviceName={grpc.get('serviceName', 'grpc')}")

        connect_host = host
        if inbound.connection_mode.value in ("cdn", "domain-fronting") and node.cdn_domain:
            connect_host = node.cdn_domain

        remark = f"{node.flag} {node.name}"
        # For Trojan, user_uuid is used as password
        return f"trojan://{user_uuid}@{connect_host}:{port}?{'&'.join(params)}#{remark}"

    @staticmethod
    def _generate_vmess_uri(
        user_uuid: str, host: str, port: int,
        transport_type: str, security: str,
        tc: dict, node: Node, inbound: Inbound,
    ) -> str:
        import base64
        import json

        connect_host = host
        if inbound.connection_mode.value in ("cdn", "domain-fronting") and node.cdn_domain:
            connect_host = node.cdn_domain

        vmess_config = {
            "v": "2",
            "ps": f"{node.flag} {node.name}",
            "add": connect_host,
            "port": str(port),
            "id": user_uuid,
            "aid": "0",
            "scy": "auto",
            "net": transport_type,
            "type": "none",
            "host": "",
            "path": "",
            "tls": security if security != "none" else "",
            "sni": "",
            "alpn": "",
            "fp": "chrome",
        }

        if transport_type == "ws":
            ws = tc.get("wsSettings", {})
            vmess_config["path"] = ws.get("path", "/ws")
            headers = ws.get("headers", {})
            vmess_config["host"] = headers.get("Host", connect_host)

        if security == "tls":
            tls_s = tc.get("tlsSettings", {})
            vmess_config["sni"] = tls_s.get("serverName", connect_host)
            vmess_config["fp"] = tls_s.get("fingerprint", "chrome")

        encoded = base64.b64encode(json.dumps(vmess_config).encode()).decode()
        return f"vmess://{encoded}"

    @staticmethod
    def _generate_hysteria2_uri(
        user_uuid: str, host: str, port: int,
        tc: dict, node: Node, inbound: Inbound,
    ) -> str:
        hy_settings = tc.get("hysteriaSettings", {})
        params = []

        obfs_password = hy_settings.get("obfsPassword", "")
        if obfs_password:
            params.extend([
                "obfs=salamander",
                f"obfs-password={obfs_password}",
            ])

        tls_s = tc.get("tlsSettings", {})
        sni = tls_s.get("serverName", host)
        params.append(f"sni={sni}")

        remark = f"{node.flag} {node.name}"
        param_str = "&".join(params)
        return f"hysteria2://{user_uuid}@{host}:{port}?{param_str}#{remark}"

    @staticmethod
    async def generate_user_configs(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> list[dict]:
        """Generate all configs for a user across all accessible nodes/inbounds."""
        # Get user
        user_result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return []

        # Get user access rules
        access_result = await db.execute(
            select(UserAccess).where(UserAccess.user_id == user_id)
        )
        access_rules = access_result.scalars().all()

        # Get all active nodes with inbounds
        nodes_result = await db.execute(
            select(Node)
            .options(selectinload(Node.inbounds))
            .where(Node.status.in_(["online", "degraded"]))
        )
        nodes = nodes_result.scalars().all()

        configs = []
        user_uuid = str(user.id)

        for node in nodes:
            # Check node access
            if access_rules:
                node_ids = [r.node_id for r in access_rules if r.node_id]
                if node_ids and node.id not in node_ids:
                    continue

            for inbound in node.inbounds:
                if not inbound.is_active:
                    continue

                # Check inbound access
                if access_rules:
                    inbound_ids = [r.inbound_id for r in access_rules if r.inbound_id]
                    if inbound_ids and inbound.id not in inbound_ids:
                        continue

                uri = ConfigService.generate_client_uri(
                    protocol=inbound.protocol.value,
                    user_uuid=user_uuid,
                    node=node,
                    inbound=inbound,
                )

                tc = inbound.transport_config or {}
                configs.append({
                    "inbound_id": str(inbound.id),
                    "node_name": node.name,
                    "protocol": inbound.protocol.value,
                    "transport": tc.get("type", "tcp"),
                    "security": tc.get("security", "none"),
                    "connection_mode": inbound.connection_mode.value,
                    "uri": uri,
                    "remark": f"{node.flag} {node.name}",
                })

        return configs

    @staticmethod
    def generate_xray_server_config(
        inbound: Inbound,
        user_uuids: list[str],
    ) -> dict:
        """Generate Xray server-side inbound config with user list."""
        tc = inbound.transport_config or {}
        transport_type = tc.get("type", "tcp")
        security = tc.get("security", "none")

        config: dict[str, Any] = {
            "tag": inbound.tag,
            "listen": "0.0.0.0",
            "port": inbound.port,
            "protocol": inbound.protocol.value,
            "settings": {"decryption": "none"},
            "sniffing": {
                "enabled": inbound.sniffing,
                "destOverride": ["http", "tls", "quic"],
            },
        }

        # Build clients list
        if inbound.protocol.value in ("vless", "vmess"):
            clients = []
            for uid in user_uuids:
                client: dict[str, Any] = {"id": uid}
                if inbound.protocol.value == "vless" and security == "reality" and transport_type == "tcp":
                    client["flow"] = "xtls-rprx-vision"
                clients.append(client)
            config["settings"]["clients"] = clients
        elif inbound.protocol.value == "trojan":
            config["settings"]["clients"] = [
                {"password": uid} for uid in user_uuids
            ]

        # Stream settings
        stream: dict[str, Any] = {"network": transport_type}

        if security == "reality":
            rs = tc.get("realitySettings", {})
            stream["security"] = "reality"
            stream["realitySettings"] = {
                "show": False,
                "dest": rs.get("dest", ""),
                "xver": 0,
                "serverNames": rs.get("serverNames", []),
                "privateKey": rs.get("privateKey", ""),
                "shortIds": rs.get("shortIds", [""]),
            }
        elif security == "tls":
            tls_s = tc.get("tlsSettings", {})
            stream["security"] = "tls"
            stream["tlsSettings"] = {
                "certificates": [
                    {
                        "certificateFile": tls_s.get("certFile", "/etc/ssl/cert.pem"),
                        "keyFile": tls_s.get("keyFile", "/etc/ssl/key.pem"),
                    }
                ],
                "alpn": tls_s.get("alpn", ["h2", "http/1.1"]),
                "fingerprint": tls_s.get("fingerprint", "chrome"),
            }

        if transport_type == "ws":
            ws = tc.get("wsSettings", {})
            stream["wsSettings"] = {
                "path": ws.get("path", "/ws"),
                "headers": ws.get("headers", {}),
            }
        elif transport_type == "grpc":
            grpc = tc.get("grpcSettings", {})
            stream["grpcSettings"] = {
                "serviceName": grpc.get("serviceName", "grpc"),
            }
        elif transport_type == "xhttp":
            xhttp = tc.get("xhttpSettings", {})
            stream["xhttpSettings"] = {
                "path": xhttp.get("path", "/"),
                "mode": xhttp.get("mode", "auto"),
            }

        config["streamSettings"] = stream

        # Fallback
        if inbound.fallback_config:
            config["settings"]["fallbacks"] = [inbound.fallback_config]

        return config

    @staticmethod
    def generate_singbox_server_config(
        inbound: Inbound,
        user_passwords: list[str],
    ) -> dict:
        """Generate Sing-box server-side inbound config."""
        tc = inbound.transport_config or {}

        if inbound.protocol.value == "hysteria2":
            hy = tc.get("hysteriaSettings", {})
            config: dict[str, Any] = {
                "tag": inbound.tag,
                "type": "hysteria2",
                "listen": "::",
                "listen_port": inbound.port,
                "users": [
                    {"name": f"user-{i}", "password": pwd}
                    for i, pwd in enumerate(user_passwords)
                ],
                "tls": {
                    "enabled": True,
                    "alpn": ["h3"],
                    "certificate_path": tc.get("tlsSettings", {}).get("certFile", "/etc/ssl/cert.pem"),
                    "key_path": tc.get("tlsSettings", {}).get("keyFile", "/etc/ssl/key.pem"),
                },
            }
            if hy.get("obfsPassword"):
                config["obfs"] = {
                    "type": "salamander",
                    "password": hy["obfsPassword"],
                }
            if hy.get("ignoreClientBandwidth"):
                config["ignore_client_bandwidth"] = True
            return config

        # Generic sing-box inbound for other protocols
        return {
            "tag": inbound.tag,
            "type": inbound.protocol.value,
            "listen": "::",
            "listen_port": inbound.port,
        }
