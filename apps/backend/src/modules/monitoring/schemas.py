import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Node heartbeat ──────────────────────────────────────────────

class NodeHeartbeat(BaseModel):
    cpu_usage: float = Field(ge=0, le=100, description="CPU usage 0-100%")
    ram_usage: float = Field(ge=0, le=100, description="RAM usage 0-100%")
    bandwidth_up: int = Field(ge=0, description="Upload bytes/sec")
    bandwidth_down: int = Field(ge=0, description="Download bytes/sec")
    active_connections: int = Field(ge=0)
    xray_running: bool = False
    singbox_running: bool = False
    xray_version: str = ""
    singbox_version: str = ""


# ── Traffic report ──────────────────────────────────────────────

class TrafficEntry(BaseModel):
    user_id: uuid.UUID
    inbound_id: uuid.UUID | None = None
    upload: int = Field(ge=0)
    download: int = Field(ge=0)


class TrafficReport(BaseModel):
    entries: list[TrafficEntry]


# ── Node event ──────────────────────────────────────────────────

class NodeEvent(BaseModel):
    type: str  # e.g. "user_connect", "user_disconnect"
    user_id: uuid.UUID | None = None
    inbound_id: uuid.UUID | None = None
    detail: str = ""


# ── Alert configuration ────────────────────────────────────────

class AlertConfig(BaseModel):
    node_offline_minutes: int = 5
    cpu_threshold: float = 90.0
    ram_threshold: float = 90.0
    cert_expiry_days: int = 7
    traffic_threshold_percent: float = 80.0


# ── Alerts ──────────────────────────────────────────────────────

class AlertType(str, enum.Enum):
    NODE_OFFLINE = "node_offline"
    HIGH_CPU = "high_cpu"
    HIGH_RAM = "high_ram"
    CERT_EXPIRING = "cert_expiring"
    TRAFFIC_THRESHOLD = "traffic_threshold"
    CORE_DOWN = "core_down"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Alert(BaseModel):
    id: uuid.UUID
    type: AlertType
    node_id: uuid.UUID
    message: str
    severity: AlertSeverity
    created_at: datetime
    resolved_at: datetime | None = None
    is_resolved: bool = False


# ── Response schemas ────────────────────────────────────────────

class MetricPoint(BaseModel):
    timestamp: datetime
    cpu: float
    ram: float
    bandwidth_up: int
    bandwidth_down: int
    connections: int


class NodeMetricsResponse(BaseModel):
    node_id: uuid.UUID
    period: str
    metrics: list[MetricPoint]


class AlertsResponse(BaseModel):
    alerts: list[Alert]
    total: int
