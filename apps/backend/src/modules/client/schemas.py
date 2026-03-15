import uuid
from datetime import datetime

from pydantic import BaseModel

from src.models.payment import PaymentProvider, PaymentStatus
from src.models.subscription import SubStatus


# --- Auth ---


class TelegramAuthRequest(BaseModel):
    telegram_id: int
    username: str | None = None
    first_name: str | None = None


class ClientTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Profile ---


class SubscriptionInfo(BaseModel):
    plan_name: str | None = None
    status: SubStatus
    start_date: datetime
    expiry_date: datetime
    traffic_limit: int
    traffic_used: int
    device_limit: int

    model_config = {"from_attributes": True}


class ClientProfileResponse(BaseModel):
    id: uuid.UUID
    username: str
    telegram_id: int | None = None
    telegram_username: str | None = None
    subscription: SubscriptionInfo | None = None

    model_config = {"from_attributes": True}


# --- Configs ---


class ClientConfigItem(BaseModel):
    inbound_id: str
    node_name: str
    protocol: str
    transport: str
    security: str
    connection_mode: str
    uri: str
    remark: str


class ClientConfigResponse(BaseModel):
    configs: list[ClientConfigItem]


# --- Servers ---


class ClientServerItem(BaseModel):
    id: uuid.UUID
    name: str
    country: str
    city: str
    flag: str
    status: str

    model_config = {"from_attributes": True}


class ClientServerResponse(BaseModel):
    servers: list[ClientServerItem]


# --- Payments ---


class ClientCreatePaymentRequest(BaseModel):
    plan_id: uuid.UUID
    provider: PaymentProvider


class ClientPaymentResponse(BaseModel):
    id: uuid.UUID
    amount: float
    currency: str
    provider: PaymentProvider
    status: PaymentStatus
    payment_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClientPaymentHistoryResponse(BaseModel):
    payments: list[ClientPaymentResponse]
    total: int


# --- Plans ---


class ClientPlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    price: float
    currency: str
    duration_days: int
    traffic_limit: int
    device_limit: int
    features: dict
    sort_order: int

    model_config = {"from_attributes": True}
