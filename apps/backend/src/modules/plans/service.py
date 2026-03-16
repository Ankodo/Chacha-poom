import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.plan import Plan
from src.modules.plans.schemas import PlanCreate, PlanUpdate


class PlanService:

    @staticmethod
    async def list_plans(db: AsyncSession, active_only: bool = False) -> list[Plan]:
        query = select(Plan).order_by(Plan.sort_order)
        if active_only:
            query = query.where(Plan.is_active.is_(True))
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_plan(db: AsyncSession, plan_id: uuid.UUID) -> Plan:
        result = await db.execute(select(Plan).where(Plan.id == plan_id))
        plan = result.scalar_one_or_none()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        return plan

    @staticmethod
    async def create_plan(db: AsyncSession, data: PlanCreate) -> Plan:
        plan = Plan(**data.model_dump())
        db.add(plan)
        await db.flush()
        await db.refresh(plan)
        return plan

    @staticmethod
    async def update_plan(db: AsyncSession, plan_id: uuid.UUID, data: PlanUpdate) -> Plan:
        plan = await PlanService.get_plan(db, plan_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(plan, key, value)
        await db.flush()
        await db.refresh(plan)
        return plan

    @staticmethod
    async def delete_plan(db: AsyncSession, plan_id: uuid.UUID) -> None:
        plan = await PlanService.get_plan(db, plan_id)
        await db.delete(plan)
        await db.flush()
