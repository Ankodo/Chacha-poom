import uuid

from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.modules.auth.dependencies import get_current_admin
from src.modules.payments.schemas import (
    CreatePaymentRequest,
    PaymentHistoryResponse,
    PaymentResponse,
    PaymentWebhookCryptoBot,
    PaymentWebhookYookassa,
)
from src.modules.payments.service import PaymentService

admin_router = APIRouter()
webhook_router = APIRouter()


# --- Admin endpoints ---


@admin_router.post("/create", response_model=PaymentResponse, status_code=201)
async def create_payment(
    data: CreatePaymentRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    payment, payment_url = await PaymentService.create_payment(db, data)
    return PaymentResponse(
        id=payment.id,
        user_id=payment.user_id,
        plan_id=payment.plan_id,
        amount=float(payment.amount),
        currency=payment.currency,
        provider=payment.provider,
        provider_payment_id=payment.provider_payment_id,
        status=payment.status,
        payment_url=payment_url,
        created_at=payment.created_at,
    )


@admin_router.post("/{payment_id}/confirm", response_model=PaymentResponse)
async def confirm_manual_payment(
    payment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    payment = await PaymentService.confirm_manual_payment(db, payment_id)
    return PaymentResponse(
        id=payment.id,
        user_id=payment.user_id,
        plan_id=payment.plan_id,
        amount=float(payment.amount),
        currency=payment.currency,
        provider=payment.provider,
        provider_payment_id=payment.provider_payment_id,
        status=payment.status,
        payment_url=None,
        created_at=payment.created_at,
    )


@admin_router.get("", response_model=PaymentHistoryResponse)
async def list_all_payments(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    payments, total = await PaymentService.list_all_payments(db, limit, offset)
    return PaymentHistoryResponse(
        payments=[
            PaymentResponse(
                id=p.id,
                user_id=p.user_id,
                plan_id=p.plan_id,
                amount=float(p.amount),
                currency=p.currency,
                provider=p.provider,
                provider_payment_id=p.provider_payment_id,
                status=p.status,
                payment_url=None,
                created_at=p.created_at,
            )
            for p in payments
        ],
        total=total,
    )


# --- Webhook endpoints (no auth, signature verification) ---


@webhook_router.post("/webhook/yukassa", status_code=200)
async def webhook_yukassa(
    data: PaymentWebhookYookassa,
    db: AsyncSession = Depends(get_db),
):
    await PaymentService.process_webhook_yukassa(db, data)
    return {"status": "ok"}


@webhook_router.post("/webhook/cryptobot", status_code=200)
async def webhook_cryptobot(
    request: Request,
    data: PaymentWebhookCryptoBot,
    db: AsyncSession = Depends(get_db),
):
    # Verify CryptoBot signature
    signature = request.headers.get("crypto-pay-api-signature", "")
    if settings.CRYPTOBOT_TOKEN:
        body = await request.body()
        if not PaymentService.verify_cryptobot_signature(
            settings.CRYPTOBOT_TOKEN, body, signature
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid webhook signature",
            )

    await PaymentService.process_webhook_cryptobot(db, data)
    return {"status": "ok"}
