import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.admin import Admin
from src.modules.auth.dependencies import get_current_admin
from src.modules.users.schemas import (
    RenewRequest,
    SubscriptionInfo,
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)
from src.modules.users.service import UserService

router = APIRouter()


def _user_to_response(user) -> UserResponse:
    sub_info = None
    if user.subscription:
        sub = user.subscription
        sub_info = SubscriptionInfo(
            status=sub.status.value,
            start_date=sub.start_date,
            expiry_date=sub.expiry_date,
            traffic_limit=sub.traffic_limit,
            traffic_used=sub.traffic_used,
            device_limit=sub.device_limit,
            plan_name=sub.plan.name if sub.plan else None,
        )
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        telegram_id=user.telegram_id,
        telegram_username=user.telegram_username,
        sub_token=user.sub_token,
        subscription=sub_info,
        created_at=user.created_at,
        created_by=user.created_by,
    )


@router.get("/", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = UserService(db)
    users, total = await service.list_users(
        skip=skip, limit=limit, search=search, status_filter=status
    )
    return UserListResponse(
        items=[_user_to_response(u) for u in users],
        total=total,
    )


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    service = UserService(db)
    user = await service.create_user(body.model_dump(), created_by=admin.username)
    return _user_to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = UserService(db)
    user = await service.get_user(user_id)
    return _user_to_response(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = UserService(db)
    user = await service.update_user(user_id, body.model_dump(exclude_unset=True))
    return _user_to_response(user)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = UserService(db)
    await service.delete_user(user_id)


@router.post("/{user_id}/renew", response_model=SubscriptionInfo)
async def renew_subscription(
    user_id: uuid.UUID,
    body: RenewRequest,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = UserService(db)
    sub = await service.renew_subscription(user_id, body.days)
    return SubscriptionInfo(
        status=sub.status.value,
        start_date=sub.start_date,
        expiry_date=sub.expiry_date,
        traffic_limit=sub.traffic_limit,
        traffic_used=sub.traffic_used,
        device_limit=sub.device_limit,
        plan_name=sub.plan.name if sub.plan else None,
    )


@router.post("/{user_id}/reset-traffic", status_code=204)
async def reset_traffic(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = UserService(db)
    await service.reset_traffic(user_id)
