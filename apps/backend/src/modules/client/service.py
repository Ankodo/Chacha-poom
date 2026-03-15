import secrets
import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.logging import logger
from src.core.security import create_access_token
from src.models.node import Node
from src.models.payment import Payment, PaymentProvider
from src.models.plan import Plan
from src.models.subscription import Subscription
from src.models.user import User
from src.models.user_access import UserAccess
from src.modules.configs.service import ConfigService
from src.modules.payments.schemas import CreatePaymentRequest
from src.modules.payments.service import PaymentService


class ClientService:

    @staticmethod
    async def auth_telegram(
        db: AsyncSession,
        telegram_id: int,
        username: str | None = None,
        first_name: str | None = None,
    ) -> str:
        """Authenticate or register a user by Telegram ID. Returns JWT access token."""
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

        if user is None:
            # Create new user
            display_name = username or first_name or f"tg_{telegram_id}"
            # Ensure unique username
            base_username = display_name
            counter = 0
            while True:
                check_name = base_username if counter == 0 else f"{base_username}_{counter}"
                existing = await db.execute(
                    select(User).where(User.username == check_name)
                )
                if existing.scalar_one_or_none() is None:
                    display_name = check_name
                    break
                counter += 1

            user = User(
                username=display_name,
                telegram_id=telegram_id,
                telegram_username=username,
                sub_token=secrets.token_urlsafe(32),
                created_by="telegram",
            )
            db.add(user)
            await db.flush()
            logger.info("New user created via Telegram", user_id=str(user.id), telegram_id=telegram_id)
        else:
            # Update Telegram username if changed
            if username and user.telegram_username != username:
                user.telegram_username = username
                await db.flush()

        # Issue JWT
        token_data = {
            "sub": str(user.id),
            "user_type": "client",
            "telegram_id": telegram_id,
        }
        access_token = create_access_token(token_data)
        return access_token

    @staticmethod
    async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> User:
        """Get user profile with subscription info eagerly loaded."""
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.subscription).selectinload(Subscription.plan)
            )
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    @staticmethod
    async def get_configs(
        db: AsyncSession, user_id: uuid.UUID, protocol_filter: str | None = None
    ) -> list[dict]:
        """Get proxy configs for the user, optionally filtered by protocol."""
        configs = await ConfigService.generate_user_configs(db, user_id)
        if protocol_filter:
            configs = [c for c in configs if c["protocol"] == protocol_filter]
        return configs

    @staticmethod
    async def get_servers(db: AsyncSession, user_id: uuid.UUID) -> list[Node]:
        """Get servers accessible to the user."""
        # Check user access rules
        access_result = await db.execute(
            select(UserAccess).where(UserAccess.user_id == user_id)
        )
        access_rules = access_result.scalars().all()

        query = select(Node).where(Node.status.in_(["online", "degraded"]))

        if access_rules:
            node_ids = [r.node_id for r in access_rules if r.node_id]
            if node_ids:
                query = query.where(Node.id.in_(node_ids))

        result = await db.execute(query.order_by(Node.name))
        return list(result.scalars().all())

    @staticmethod
    async def create_payment(
        db: AsyncSession,
        user_id: uuid.UUID,
        plan_id: uuid.UUID,
        provider: PaymentProvider,
    ) -> tuple[Payment, str | None]:
        """Create a payment for the client user."""
        data = CreatePaymentRequest(
            user_id=user_id,
            plan_id=plan_id,
            provider=provider,
        )
        return await PaymentService.create_payment(db, data)

    @staticmethod
    async def get_available_plans(db: AsyncSession) -> list[Plan]:
        """Get active plans available for purchase."""
        result = await db.execute(
            select(Plan)
            .where(Plan.is_active.is_(True))
            .order_by(Plan.sort_order)
        )
        return list(result.scalars().all())
