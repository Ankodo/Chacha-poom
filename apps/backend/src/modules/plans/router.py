import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.auth.dependencies import get_current_admin
from src.modules.plans.schemas import PlanCreate, PlanUpdate, PlanResponse
from src.modules.plans.service import PlanService

router = APIRouter()


@router.get("", response_model=list[PlanResponse])
async def list_plans(
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    plans = await PlanService.list_plans(db, active_only)
    return [PlanResponse(id=str(p.id), **{k: getattr(p, k) for k in PlanResponse.model_fields if k != "id"}) for p in plans]


@router.post("", response_model=PlanResponse, status_code=201)
async def create_plan(
    data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    plan = await PlanService.create_plan(db, data)
    return PlanResponse(id=str(plan.id), name=plan.name, price=float(plan.price),
                        currency=plan.currency, duration_days=plan.duration_days,
                        traffic_limit=plan.traffic_limit, device_limit=plan.device_limit,
                        features=plan.features, is_active=plan.is_active, sort_order=plan.sort_order)


@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    plan = await PlanService.get_plan(db, plan_id)
    return PlanResponse(id=str(plan.id), name=plan.name, price=float(plan.price),
                        currency=plan.currency, duration_days=plan.duration_days,
                        traffic_limit=plan.traffic_limit, device_limit=plan.device_limit,
                        features=plan.features, is_active=plan.is_active, sort_order=plan.sort_order)


@router.put("/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: uuid.UUID,
    data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    plan = await PlanService.update_plan(db, plan_id, data)
    return PlanResponse(id=str(plan.id), name=plan.name, price=float(plan.price),
                        currency=plan.currency, duration_days=plan.duration_days,
                        traffic_limit=plan.traffic_limit, device_limit=plan.device_limit,
                        features=plan.features, is_active=plan.is_active, sort_order=plan.sort_order)


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    await PlanService.delete_plan(db, plan_id)
