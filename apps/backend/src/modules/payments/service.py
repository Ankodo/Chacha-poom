import hashlib
import hmac
import uuid
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.logging import logger
from src.models.payment import Payment, PaymentProvider, PaymentStatus
from src.models.plan import Plan
from src.models.subscription import Subscription, SubStatus
from src.models.user import User
from src.modules.payments.schemas import (
    CreatePaymentRequest,
    PaymentWebhookCryptoBot,
    PaymentWebhookYookassa,
)


class PaymentService:

    @staticmethod
    async def create_payment(db: AsyncSession, data: CreatePaymentRequest) -> tuple[Payment, str | None]:
        """Create a payment record and obtain payment URL from provider.

        Returns (payment, payment_url) tuple.
        """
        # Validate user
        user_result = await db.execute(select(User).where(User.id == data.user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Validate plan
        plan_result = await db.execute(select(Plan).where(Plan.id == data.plan_id))
        plan = plan_result.scalar_one_or_none()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        if not plan.is_active:
            raise HTTPException(status_code=400, detail="Plan is not active")

        payment = Payment(
            user_id=data.user_id,
            plan_id=data.plan_id,
            amount=float(plan.price),
            currency=plan.currency,
            provider=data.provider,
            status=PaymentStatus.PENDING,
        )
        db.add(payment)
        await db.flush()

        payment_url: str | None = None

        if data.provider == PaymentProvider.YUKASSA:
            payment_url = await PaymentService._create_yukassa_payment(payment, plan, user)
        elif data.provider == PaymentProvider.CRYPTOBOT:
            payment_url = await PaymentService._create_cryptobot_payment(payment, plan, user)
        elif data.provider == PaymentProvider.MANUAL:
            # No external call needed for manual payments
            pass
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported payment provider: {data.provider}")

        await db.flush()
        return payment, payment_url

    @staticmethod
    async def _create_yukassa_payment(payment: Payment, plan: Plan, user: User) -> str | None:
        """Call YooKassa API to create a payment and return confirmation URL."""
        url = "https://api.yookassa.ru/v3/payments"
        idempotence_key = str(payment.id)

        payload = {
            "amount": {
                "value": f"{float(plan.price):.2f}",
                "currency": plan.currency,
            },
            "confirmation": {
                "type": "redirect",
                "return_url": f"https://proxyforge.app/payment/callback?id={payment.id}",
            },
            "capture": True,
            "description": f"ProxyForge — {plan.name}",
            "metadata": {
                "payment_id": str(payment.id),
                "user_id": str(user.id),
                "plan_id": str(plan.id),
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    auth=(settings.YUKASSA_SHOP_ID, settings.YUKASSA_SECRET_KEY),
                    headers={
                        "Idempotence-Key": idempotence_key,
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
                result = response.json()
                payment.provider_payment_id = result.get("id")
                confirmation = result.get("confirmation", {})
                return confirmation.get("confirmation_url")
        except httpx.HTTPStatusError as exc:
            logger.error("YooKassa API error", status=exc.response.status_code, body=exc.response.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Payment provider error",
            )
        except httpx.RequestError as exc:
            logger.error("YooKassa connection error", error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Payment provider unavailable",
            )

    @staticmethod
    async def _create_cryptobot_payment(payment: Payment, plan: Plan, user: User) -> str | None:
        """Call CryptoBot API to create an invoice and return pay URL."""
        url = "https://pay.crypt.bot/api/createInvoice"

        payload = {
            "asset": "USDT",
            "amount": f"{float(plan.price):.2f}",
            "description": f"ProxyForge — {plan.name}",
            "payload": str(payment.id),
            "allow_anonymous": True,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Crypto-Pay-API-Token": settings.CRYPTOBOT_TOKEN,
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
                result = response.json()
                if not result.get("ok"):
                    logger.error("CryptoBot API error", result=result)
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="CryptoBot payment creation failed",
                    )
                invoice = result.get("result", {})
                payment.provider_payment_id = str(invoice.get("invoice_id", ""))
                return invoice.get("pay_url")
        except httpx.HTTPStatusError as exc:
            logger.error("CryptoBot API error", status=exc.response.status_code, body=exc.response.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Payment provider error",
            )
        except httpx.RequestError as exc:
            logger.error("CryptoBot connection error", error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Payment provider unavailable",
            )

    @staticmethod
    async def process_webhook_yukassa(db: AsyncSession, data: PaymentWebhookYookassa) -> None:
        """Process incoming YooKassa webhook notification."""
        provider_payment_id = data.object.id
        yookassa_status = data.object.status

        result = await db.execute(
            select(Payment).where(Payment.provider_payment_id == provider_payment_id)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            logger.warning("YooKassa webhook: payment not found", provider_id=provider_payment_id)
            return

        if payment.status != PaymentStatus.PENDING:
            logger.info("YooKassa webhook: payment already processed", payment_id=str(payment.id))
            return

        if yookassa_status == "succeeded" and data.object.paid:
            payment.status = PaymentStatus.COMPLETED
            await db.flush()
            await PaymentService.activate_subscription(db, payment.user_id, payment.plan_id)
            logger.info("Payment completed via YooKassa", payment_id=str(payment.id))
        elif yookassa_status == "canceled":
            payment.status = PaymentStatus.FAILED
            await db.flush()
            logger.info("Payment canceled via YooKassa", payment_id=str(payment.id))

    @staticmethod
    async def process_webhook_cryptobot(db: AsyncSession, data: PaymentWebhookCryptoBot) -> None:
        """Process incoming CryptoBot webhook notification."""
        if data.update_type != "invoice_paid":
            return

        payment_id_str = data.payload
        if not payment_id_str:
            logger.warning("CryptoBot webhook: no payload")
            return

        try:
            payment_id = uuid.UUID(payment_id_str)
        except ValueError:
            logger.warning("CryptoBot webhook: invalid payload UUID", payload=payment_id_str)
            return

        result = await db.execute(select(Payment).where(Payment.id == payment_id))
        payment = result.scalar_one_or_none()
        if not payment:
            logger.warning("CryptoBot webhook: payment not found", payment_id=payment_id_str)
            return

        if payment.status != PaymentStatus.PENDING:
            logger.info("CryptoBot webhook: payment already processed", payment_id=payment_id_str)
            return

        payment.status = PaymentStatus.COMPLETED
        await db.flush()
        await PaymentService.activate_subscription(db, payment.user_id, payment.plan_id)
        logger.info("Payment completed via CryptoBot", payment_id=payment_id_str)

    @staticmethod
    def verify_cryptobot_signature(token: str, body: bytes, signature: str) -> bool:
        """Verify CryptoBot webhook signature using HMAC-SHA256."""
        secret = hashlib.sha256(token.encode()).digest()
        expected = hmac.new(secret, body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    @staticmethod
    async def confirm_manual_payment(db: AsyncSession, payment_id: uuid.UUID) -> Payment:
        """Admin confirms a manual payment."""
        result = await db.execute(select(Payment).where(Payment.id == payment_id))
        payment = result.scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        if payment.provider != PaymentProvider.MANUAL:
            raise HTTPException(status_code=400, detail="Only manual payments can be confirmed this way")
        if payment.status != PaymentStatus.PENDING:
            raise HTTPException(status_code=400, detail="Payment is not in pending state")

        payment.status = PaymentStatus.COMPLETED
        await db.flush()
        await PaymentService.activate_subscription(db, payment.user_id, payment.plan_id)
        logger.info("Manual payment confirmed", payment_id=str(payment.id))
        return payment

    @staticmethod
    async def activate_subscription(
        db: AsyncSession, user_id: uuid.UUID, plan_id: uuid.UUID | None
    ) -> None:
        """Create or extend a subscription based on the plan."""
        if not plan_id:
            return

        plan_result = await db.execute(select(Plan).where(Plan.id == plan_id))
        plan = plan_result.scalar_one_or_none()
        if not plan:
            logger.error("activate_subscription: plan not found", plan_id=str(plan_id))
            return

        sub_result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = sub_result.scalar_one_or_none()

        now = datetime.now(UTC)
        duration = timedelta(days=plan.duration_days)

        if subscription:
            # Extend existing subscription
            if subscription.status == SubStatus.ACTIVE and subscription.expiry_date > now:
                # Add days to current expiry
                subscription.expiry_date = subscription.expiry_date + duration
            else:
                # Reset subscription
                subscription.start_date = now
                subscription.expiry_date = now + duration

            subscription.plan_id = plan_id
            subscription.status = SubStatus.ACTIVE
            subscription.traffic_limit = plan.traffic_limit
            subscription.traffic_used = 0
            subscription.device_limit = plan.device_limit
        else:
            # Create new subscription
            subscription = Subscription(
                user_id=user_id,
                plan_id=plan_id,
                status=SubStatus.ACTIVE,
                start_date=now,
                expiry_date=now + duration,
                traffic_limit=plan.traffic_limit,
                traffic_used=0,
                device_limit=plan.device_limit,
            )
            db.add(subscription)

        await db.flush()
        logger.info(
            "Subscription activated",
            user_id=str(user_id),
            plan=plan.name,
            expiry=str(subscription.expiry_date),
        )

    @staticmethod
    async def get_payment_history(
        db: AsyncSession, user_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[Payment], int]:
        """Return payment history for a user."""
        count_result = await db.execute(
            select(Payment).where(Payment.user_id == user_id)
        )
        total = len(count_result.scalars().all())

        result = await db.execute(
            select(Payment)
            .where(Payment.user_id == user_id)
            .order_by(desc(Payment.created_at))
            .limit(limit)
            .offset(offset)
        )
        payments = list(result.scalars().all())
        return payments, total

    @staticmethod
    async def list_all_payments(
        db: AsyncSession, limit: int = 50, offset: int = 0
    ) -> tuple[list[Payment], int]:
        """Return all payments (admin)."""
        count_result = await db.execute(select(Payment))
        total = len(count_result.scalars().all())

        result = await db.execute(
            select(Payment)
            .order_by(desc(Payment.created_at))
            .limit(limit)
            .offset(offset)
        )
        payments = list(result.scalars().all())
        return payments, total
