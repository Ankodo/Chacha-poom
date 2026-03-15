import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from src.models.payment import PaymentProvider, PaymentStatus


# --- Requests ---


class CreatePaymentRequest(BaseModel):
    user_id: uuid.UUID
    plan_id: uuid.UUID
    provider: PaymentProvider


# --- Responses ---


class PaymentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    plan_id: uuid.UUID | None
    amount: float
    currency: str
    provider: PaymentProvider
    provider_payment_id: str | None = None
    status: PaymentStatus
    payment_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentHistoryResponse(BaseModel):
    payments: list[PaymentResponse]
    total: int


# --- Webhook payloads ---


class YookassaAmount(BaseModel):
    value: str
    currency: str


class YookassaPaymentObject(BaseModel):
    id: str
    status: str
    amount: YookassaAmount
    paid: bool = False
    metadata: dict | None = None


class PaymentWebhookYookassa(BaseModel):
    type: str  # "notification"
    event: str  # "payment.succeeded", "payment.canceled", etc.
    object: YookassaPaymentObject


class PaymentWebhookCryptoBot(BaseModel):
    update_id: int
    update_type: str  # "invoice_paid"
    request_date: str | None = None
    payload: str | None = None
    status: str | None = None
    hash: str | None = None
    amount: str | None = None
    asset: str | None = None
    invoice_id: int | None = None
