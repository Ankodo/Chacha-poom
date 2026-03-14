import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.subscription import SubStatus, Subscription
from src.models.user import User


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        status_filter: str | None = None,
    ) -> tuple[list[User], int]:
        query = select(User).options(
            selectinload(User.subscription).selectinload(Subscription.plan)
        )
        count_query = select(func.count()).select_from(User)

        if search:
            pattern = f"%{search}%"
            search_filter = or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.telegram_username.ilike(pattern),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if status_filter:
            query = query.join(User.subscription).where(
                Subscription.status == SubStatus(status_filter)
            )
            count_query = count_query.join(User.subscription).where(
                Subscription.status == SubStatus(status_filter)
            )

        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        users = list(result.scalars().all())

        return users, total

    async def get_user(self, user_id: uuid.UUID) -> User:
        query = (
            select(User)
            .options(
                selectinload(User.subscription).selectinload(Subscription.plan)
            )
            .where(User.id == user_id)
        )
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user

    async def create_user(self, data: dict, created_by: str = "admin") -> User:
        # Extract subscription-related fields
        plan_id = data.pop("plan_id", None)
        expiry_days = data.pop("expiry_days", 30)
        traffic_limit = data.pop("traffic_limit", 0)
        device_limit = data.pop("device_limit", 0)
        _node_ids = data.pop("node_ids", [])
        _inbound_ids = data.pop("inbound_ids", [])
        password = data.pop("password", None)

        # Generate sub_token
        sub_token = uuid.uuid4().hex[:16]

        user = User(
            **data,
            sub_token=sub_token,
            created_by=created_by,
        )

        if password:
            from src.core.security import hash_password
            user.password_hash = hash_password(password)

        self.db.add(user)
        await self.db.flush()

        # Create subscription
        now = datetime.now(UTC)
        subscription = Subscription(
            user_id=user.id,
            plan_id=plan_id,
            status=SubStatus.ACTIVE,
            start_date=now,
            expiry_date=now + timedelta(days=expiry_days),
            traffic_limit=traffic_limit,
            traffic_used=0,
            device_limit=device_limit,
        )
        self.db.add(subscription)
        await self.db.flush()
        await self.db.refresh(user, attribute_names=["subscription"])

        return user

    async def update_user(self, user_id: uuid.UUID, data: dict) -> User:
        user = await self.get_user(user_id)

        # Handle subscription-related fields
        traffic_limit = data.pop("traffic_limit", None)
        device_limit = data.pop("device_limit", None)
        plan_id = data.pop("plan_id", None)
        _node_ids = data.pop("node_ids", None)
        _inbound_ids = data.pop("inbound_ids", None)
        password = data.pop("password", None)

        for key, value in data.items():
            setattr(user, key, value)

        if password:
            from src.core.security import hash_password
            user.password_hash = hash_password(password)

        # Update subscription fields if provided
        if user.subscription and any(
            v is not None for v in [traffic_limit, device_limit, plan_id]
        ):
            if traffic_limit is not None:
                user.subscription.traffic_limit = traffic_limit
            if device_limit is not None:
                user.subscription.device_limit = device_limit
            if plan_id is not None:
                user.subscription.plan_id = plan_id

        await self.db.flush()
        await self.db.refresh(user, attribute_names=["subscription"])
        return user

    async def delete_user(self, user_id: uuid.UUID) -> None:
        user = await self.get_user(user_id)
        await self.db.delete(user)
        await self.db.flush()

    async def renew_subscription(
        self, user_id: uuid.UUID, days: int
    ) -> Subscription:
        user = await self.get_user(user_id)
        if user.subscription is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User has no subscription",
            )

        sub = user.subscription
        now = datetime.now(UTC)

        # If expired, start from now; otherwise extend from current expiry
        base_date = max(sub.expiry_date, now)
        sub.expiry_date = base_date + timedelta(days=days)
        sub.status = SubStatus.ACTIVE

        await self.db.flush()
        await self.db.refresh(sub)
        return sub

    async def reset_traffic(self, user_id: uuid.UUID) -> None:
        user = await self.get_user(user_id)
        if user.subscription is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User has no subscription",
            )
        user.subscription.traffic_used = 0
        await self.db.flush()
