import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.admin import Admin
from src.modules.auth.dependencies import get_current_admin
from src.modules.nodes.schemas import (
    NodeCreate,
    NodeListResponse,
    NodeResponse,
    NodeUpdate,
)
from src.modules.nodes.service import NodeService

router = APIRouter()


def _node_to_response(node) -> NodeResponse:
    return NodeResponse(
        id=node.id,
        name=node.name,
        host=node.host,
        port=node.port,
        country=node.country,
        city=node.city,
        flag=node.flag,
        cores_config=node.cores_config,
        status=node.status.value,
        last_heartbeat=node.last_heartbeat,
        region_profile=node.region_profile.value,
        max_users=node.max_users,
        traffic_limit=node.traffic_limit,
        sni_domains=node.sni_domains,
        cdn_domain=node.cdn_domain,
        certificate_type=node.certificate_type,
        created_at=node.created_at,
        inbound_count=len(node.inbounds) if node.inbounds else 0,
    )


@router.get("/", response_model=NodeListResponse)
async def list_nodes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = NodeService(db)
    nodes, total = await service.list_nodes(skip=skip, limit=limit, status_filter=status)
    return NodeListResponse(
        items=[_node_to_response(n) for n in nodes],
        total=total,
    )


@router.post("/", response_model=NodeResponse, status_code=201)
async def create_node(
    body: NodeCreate,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = NodeService(db)
    node = await service.create_node(body.model_dump())
    return _node_to_response(node)


@router.get("/{node_id}", response_model=NodeResponse)
async def get_node(
    node_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = NodeService(db)
    node = await service.get_node(node_id)
    return _node_to_response(node)


@router.put("/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: uuid.UUID,
    body: NodeUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = NodeService(db)
    node = await service.update_node(node_id, body.model_dump(exclude_unset=True))
    return _node_to_response(node)


@router.delete("/{node_id}", status_code=204)
async def delete_node(
    node_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = NodeService(db)
    await service.delete_node(node_id)
