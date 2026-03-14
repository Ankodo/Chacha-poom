import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.inbound import ConnectionMode, Core, Inbound, Protocol


class InboundService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_inbounds(
        self,
        skip: int = 0,
        limit: int = 50,
        node_id: uuid.UUID | None = None,
        protocol: str | None = None,
    ) -> tuple[list[Inbound], int]:
        query = select(Inbound)
        count_query = select(func.count()).select_from(Inbound)

        if node_id:
            query = query.where(Inbound.node_id == node_id)
            count_query = count_query.where(Inbound.node_id == node_id)

        if protocol:
            query = query.where(Inbound.protocol == Protocol(protocol))
            count_query = count_query.where(Inbound.protocol == Protocol(protocol))

        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(Inbound.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        inbounds = list(result.scalars().all())

        return inbounds, total

    async def get_inbound(self, inbound_id: uuid.UUID) -> Inbound:
        query = select(Inbound).where(Inbound.id == inbound_id)
        result = await self.db.execute(query)
        inbound = result.scalar_one_or_none()
        if inbound is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inbound not found",
            )
        return inbound

    async def create_inbound(self, data: dict) -> Inbound:
        # Convert string enum values
        if "protocol" in data and isinstance(data["protocol"], str):
            data["protocol"] = Protocol(data["protocol"])
        if "core" in data and isinstance(data["core"], str):
            data["core"] = Core(data["core"])
        if "connection_mode" in data and isinstance(data["connection_mode"], str):
            data["connection_mode"] = ConnectionMode(data["connection_mode"])

        inbound = Inbound(**data)
        self.db.add(inbound)
        await self.db.flush()
        await self.db.refresh(inbound)
        return inbound

    async def update_inbound(self, inbound_id: uuid.UUID, data: dict) -> Inbound:
        inbound = await self.get_inbound(inbound_id)
        for key, value in data.items():
            if key == "protocol" and isinstance(value, str):
                value = Protocol(value)
            elif key == "core" and isinstance(value, str):
                value = Core(value)
            elif key == "connection_mode" and isinstance(value, str):
                value = ConnectionMode(value)
            setattr(inbound, key, value)
        await self.db.flush()
        await self.db.refresh(inbound)
        return inbound

    async def delete_inbound(self, inbound_id: uuid.UUID) -> None:
        inbound = await self.get_inbound(inbound_id)
        await self.db.delete(inbound)
        await self.db.flush()
