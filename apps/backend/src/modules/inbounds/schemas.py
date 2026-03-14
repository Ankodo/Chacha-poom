import uuid
from datetime import datetime

from pydantic import BaseModel


class InboundCreate(BaseModel):
    node_id: uuid.UUID
    protocol: str
    core: str
    transport_config: dict = {}
    port: int
    connection_mode: str = "direct"
    tag: str
    max_connections: int = 0
    sniffing: bool = True
    fallback_config: dict | None = None


class InboundUpdate(BaseModel):
    node_id: uuid.UUID | None = None
    protocol: str | None = None
    core: str | None = None
    transport_config: dict | None = None
    port: int | None = None
    connection_mode: str | None = None
    tag: str | None = None
    max_connections: int | None = None
    sniffing: bool | None = None
    fallback_config: dict | None = None


class InboundResponse(BaseModel):
    id: uuid.UUID
    node_id: uuid.UUID
    protocol: str
    core: str
    transport_config: dict
    port: int
    connection_mode: str
    tag: str
    max_connections: int
    sniffing: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class InboundListResponse(BaseModel):
    items: list[InboundResponse]
    total: int
