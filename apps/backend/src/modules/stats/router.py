from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.auth.dependencies import get_current_admin
from src.modules.stats.schemas import DashboardStats, TrafficStats, UserStats
from src.modules.stats.service import StatsService

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    data = await StatsService.get_dashboard_stats(db)
    return DashboardStats(**data)


@router.get("/traffic", response_model=TrafficStats)
async def get_traffic_stats(
    period: str = Query("24h", pattern="^(24h|7d|30d)$"),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    data = await StatsService.get_traffic_stats(db, period)
    return TrafficStats(**data)


@router.get("/users", response_model=UserStats)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    data = await StatsService.get_user_stats(db)
    return UserStats(**data)
