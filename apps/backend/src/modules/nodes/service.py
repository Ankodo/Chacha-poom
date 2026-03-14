import secrets
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.node import Node, NodeStatus, RegionProfile


class NodeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_nodes(
        self,
        skip: int = 0,
        limit: int = 50,
        status_filter: str | None = None,
    ) -> tuple[list[Node], int]:
        query = select(Node).options(selectinload(Node.inbounds))

        if status_filter:
            query = query.where(Node.status == NodeStatus(status_filter))

        total_query = select(func.count()).select_from(Node)
        if status_filter:
            total_query = total_query.where(Node.status == NodeStatus(status_filter))

        total_result = await self.db.execute(total_query)
        total = total_result.scalar_one()

        query = query.order_by(Node.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        nodes = list(result.scalars().all())

        return nodes, total

    async def get_node(self, node_id: uuid.UUID) -> Node:
        query = (
            select(Node)
            .options(selectinload(Node.inbounds))
            .where(Node.id == node_id)
        )
        result = await self.db.execute(query)
        node = result.scalar_one_or_none()
        if node is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found",
            )
        return node

    async def create_node(self, data: dict) -> Node:
        node = Node(
            **data,
            agent_token=secrets.token_urlsafe(32),
        )
        if "region_profile" in data and isinstance(data["region_profile"], str):
            node.region_profile = RegionProfile(data["region_profile"])
        self.db.add(node)
        await self.db.flush()
        await self.db.refresh(node, attribute_names=["inbounds"])
        return node

    async def update_node(self, node_id: uuid.UUID, data: dict) -> Node:
        node = await self.get_node(node_id)
        for key, value in data.items():
            if key == "region_profile" and isinstance(value, str):
                value = RegionProfile(value)
            setattr(node, key, value)
        await self.db.flush()
        await self.db.refresh(node, attribute_names=["inbounds"])
        return node

    async def delete_node(self, node_id: uuid.UUID) -> None:
        node = await self.get_node(node_id)
        await self.db.delete(node)
        await self.db.flush()
