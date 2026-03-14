import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class NodeCreate(BaseModel):
    name: str
    host: str
    port: int = 22
    country: str = Field(..., min_length=2, max_length=2)
    city: str = ""
    flag: str = ""
    cores_config: dict = Field(default_factory=dict)
    max_users: int = 0
    traffic_limit: int = 0
    sni_domains: list[str] = Field(default_factory=list)
    cdn_domain: str = ""
    certificate_type: str = "reality"
    region_profile: str = "universal"


class NodeUpdate(BaseModel):
    name: str | None = None
    host: str | None = None
    port: int | None = None
    country: str | None = Field(None, min_length=2, max_length=2)
    city: str | None = None
    flag: str | None = None
    cores_config: dict | None = None
    max_users: int | None = None
    traffic_limit: int | None = None
    sni_domains: list[str] | None = None
    cdn_domain: str | None = None
    certificate_type: str | None = None
    region_profile: str | None = None


class NodeResponse(BaseModel):
    id: uuid.UUID
    name: str
    host: str
    port: int
    country: str
    city: str
    flag: str
    cores_config: dict
    status: str
    last_heartbeat: datetime | None
    region_profile: str
    max_users: int
    traffic_limit: int
    sni_domains: list[str]
    cdn_domain: str
    certificate_type: str
    created_at: datetime
    inbound_count: int

    model_config = {"from_attributes": True}


class NodeListResponse(BaseModel):
    items: list[NodeResponse]
    total: int
