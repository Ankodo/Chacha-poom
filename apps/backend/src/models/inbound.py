import uuid
from datetime import UTC, datetime
import enum

from sqlalchemy import String, Integer, Enum as SAEnum, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class Protocol(str, enum.Enum):
    VLESS = "vless"
    VMESS = "vmess"
    TROJAN = "trojan"
    SHADOWSOCKS = "shadowsocks"
    HYSTERIA2 = "hysteria2"
    TUIC = "tuic"
    WIREGUARD = "wireguard"


class Core(str, enum.Enum):
    XRAY = "xray"
    SINGBOX = "singbox"


class ConnectionMode(str, enum.Enum):
    DIRECT = "direct"
    CDN = "cdn"
    DOMAIN_FRONTING = "domain-fronting"


class Inbound(Base):
    __tablename__ = "inbounds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False
    )

    # Protocol
    protocol: Mapped[Protocol] = mapped_column(SAEnum(Protocol), nullable=False)
    core: Mapped[Core] = mapped_column(SAEnum(Core), nullable=False)

    # Transport config (full JSON)
    transport_config: Mapped[dict] = mapped_column(JSON, default=dict)
    # {
    #   "type": "tcp|ws|grpc|h2|quic|xhttp",
    #   "security": "tls|reality|none",
    #   "realitySettings": {...},
    #   "tlsSettings": {...},
    #   "wsSettings": {...},
    #   "grpcSettings": {...},
    #   "hysteriaSettings": {...}
    # }

    port: Mapped[int] = mapped_column(Integer, nullable=False)
    connection_mode: Mapped[ConnectionMode] = mapped_column(
        SAEnum(ConnectionMode), default=ConnectionMode.DIRECT
    )

    # Tag for xray/singbox config
    tag: Mapped[str] = mapped_column(String(100), nullable=False)

    # Settings
    max_connections: Mapped[int] = mapped_column(Integer, default=0)
    sniffing: Mapped[bool] = mapped_column(Boolean, default=True)
    fallback_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    # Relationships
    node: Mapped["Node"] = relationship(back_populates="inbounds")  # type: ignore[name-defined]  # noqa: F821
