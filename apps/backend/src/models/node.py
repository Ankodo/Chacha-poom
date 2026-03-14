import uuid
from datetime import UTC, datetime
import enum

from sqlalchemy import String, Integer, Enum as SAEnum, DateTime, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class NodeStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"
    MAINTENANCE = "maintenance"


class RegionProfile(str, enum.Enum):
    MOSCOW = "moscow"
    RUSSIA_REGIONS = "russia-regions"
    CHINA = "china"
    IRAN = "iran"
    UNIVERSAL = "universal"


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, default=22)

    # Location
    country: Mapped[str] = mapped_column(String(2), nullable=False)  # ISO country code
    city: Mapped[str] = mapped_column(String(100), default="")
    flag: Mapped[str] = mapped_column(String(10), default="")

    # Cores config
    cores_config: Mapped[dict] = mapped_column(JSON, default=dict)
    # {
    #   "xray": {"enabled": true, "version": "", "apiPort": 10085, "configPath": "..."},
    #   "singbox": {"enabled": false, "version": "", "apiPort": 10086, "configPath": "..."}
    # }

    # Settings
    max_users: Mapped[int] = mapped_column(Integer, default=0)  # 0 = unlimited
    traffic_limit: Mapped[int] = mapped_column(Integer, default=0)  # bytes, 0 = unlimited
    sni_domains: Mapped[list] = mapped_column(JSON, default=list)
    cdn_domain: Mapped[str] = mapped_column(String(255), default="")
    certificate_type: Mapped[str] = mapped_column(String(20), default="reality")

    # Status
    status: Mapped[NodeStatus] = mapped_column(SAEnum(NodeStatus), default=NodeStatus.OFFLINE)
    last_heartbeat: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Region
    region_profile: Mapped[RegionProfile] = mapped_column(
        SAEnum(RegionProfile), default=RegionProfile.UNIVERSAL
    )

    # Agent
    agent_token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    # Relationships
    inbounds: Mapped[list["Inbound"]] = relationship(back_populates="node", cascade="all, delete-orphan")  # type: ignore[name-defined]  # noqa: F821
