from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.user import User
from src.modules.client.dependencies import get_current_client
from src.modules.client.schemas import (
    ClientConfigItem,
    ClientConfigResponse,
    ClientCreatePaymentRequest,
    ClientPaymentHistoryResponse,
    ClientPaymentResponse,
    ClientPlanResponse,
    ClientProfileResponse,
    ClientServerItem,
    ClientServerResponse,
    ClientTokenResponse,
    SubscriptionInfo,
    TelegramAuthRequest,
)
from src.modules.client.service import ClientService
from src.modules.payments.service import PaymentService

router = APIRouter()


@router.post("/auth/telegram", response_model=ClientTokenResponse)
async def auth_telegram(
    data: TelegramAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    access_token = await ClientService.auth_telegram(
        db,
        telegram_id=data.telegram_id,
        username=data.username,
        first_name=data.first_name,
    )
    return ClientTokenResponse(access_token=access_token)


@router.get("/profile", response_model=ClientProfileResponse)
async def get_profile(
    user: User = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    profile = await ClientService.get_profile(db, user.id)
    sub_info = None
    if profile.subscription:
        sub = profile.subscription
        plan_name = sub.plan.name if sub.plan else None
        sub_info = SubscriptionInfo(
            plan_name=plan_name,
            status=sub.status,
            start_date=sub.start_date,
            expiry_date=sub.expiry_date,
            traffic_limit=sub.traffic_limit,
            traffic_used=sub.traffic_used,
            device_limit=sub.device_limit,
        )
    return ClientProfileResponse(
        id=profile.id,
        username=profile.username,
        telegram_id=profile.telegram_id,
        telegram_username=profile.telegram_username,
        subscription=sub_info,
    )


@router.get("/configs", response_model=ClientConfigResponse)
async def get_configs(
    user: User = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    configs = await ClientService.get_configs(db, user.id)
    return ClientConfigResponse(
        configs=[ClientConfigItem(**c) for c in configs]
    )


@router.get("/configs/{protocol}", response_model=ClientConfigResponse)
async def get_configs_by_protocol(
    protocol: str,
    user: User = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    configs = await ClientService.get_configs(db, user.id, protocol_filter=protocol)
    return ClientConfigResponse(
        configs=[ClientConfigItem(**c) for c in configs]
    )


@router.get("/servers", response_model=ClientServerResponse)
async def get_servers(
    user: User = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    nodes = await ClientService.get_servers(db, user.id)
    return ClientServerResponse(
        servers=[
            ClientServerItem(
                id=n.id,
                name=n.name,
                country=n.country,
                city=n.city,
                flag=n.flag,
                status=n.status.value,
            )
            for n in nodes
        ]
    )


@router.post("/payments/create", response_model=ClientPaymentResponse, status_code=201)
async def create_payment(
    data: ClientCreatePaymentRequest,
    user: User = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    payment, payment_url = await ClientService.create_payment(
        db, user.id, data.plan_id, data.provider
    )
    return ClientPaymentResponse(
        id=payment.id,
        amount=float(payment.amount),
        currency=payment.currency,
        provider=payment.provider,
        status=payment.status,
        payment_url=payment_url,
        created_at=payment.created_at,
    )


@router.get("/payments/history", response_model=ClientPaymentHistoryResponse)
async def get_payment_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    payments, total = await PaymentService.get_payment_history(db, user.id, limit, offset)
    return ClientPaymentHistoryResponse(
        payments=[
            ClientPaymentResponse(
                id=p.id,
                amount=float(p.amount),
                currency=p.currency,
                provider=p.provider,
                status=p.status,
                payment_url=None,
                created_at=p.created_at,
            )
            for p in payments
        ],
        total=total,
    )


@router.get("/plans", response_model=list[ClientPlanResponse])
async def get_plans(
    db: AsyncSession = Depends(get_db),
):
    plans = await ClientService.get_available_plans(db)
    return [
        ClientPlanResponse(
            id=p.id,
            name=p.name,
            price=float(p.price),
            currency=p.currency,
            duration_days=p.duration_days,
            traffic_limit=p.traffic_limit,
            device_limit=p.device_limit,
            features=p.features,
            sort_order=p.sort_order,
        )
        for p in plans
    ]
