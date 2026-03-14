import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SubscriptionInfo(BaseModel):
    status: str
    start_date: datetime
    expiry_date: datetime
    traffic_limit: int
    traffic_used: int
    device_limit: int
    plan_name: str | None = None

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: str | None = None
    telegram_id: int | None = None
    telegram_username: str | None = None
    password: str | None = None
    plan_id: uuid.UUID | None = None
    expiry_days: int = 30
    traffic_limit: int = 0
    device_limit: int = 0
    node_ids: list[uuid.UUID] = Field(default_factory=list)
    inbound_ids: list[uuid.UUID] = Field(default_factory=list)


class UserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    telegram_id: int | None = None
    telegram_username: str | None = None
    password: str | None = None
    plan_id: uuid.UUID | None = None
    traffic_limit: int | None = None
    device_limit: int | None = None
    node_ids: list[uuid.UUID] | None = None
    inbound_ids: list[uuid.UUID] | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str | None
    telegram_id: int | None
    telegram_username: str | None
    sub_token: str
    subscription: SubscriptionInfo | None = None
    created_at: datetime
    created_by: str

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int


class RenewRequest(BaseModel):
    days: int = Field(..., gt=0)
