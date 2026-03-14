import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.admin import Admin
from src.modules.auth.dependencies import get_current_admin
from src.modules.inbounds.schemas import (
    InboundCreate,
    InboundListResponse,
    InboundResponse,
    InboundUpdate,
)
from src.modules.inbounds.service import InboundService

router = APIRouter()


def _inbound_to_response(inbound) -> InboundResponse:
    return InboundResponse(
        id=inbound.id,
        node_id=inbound.node_id,
        protocol=inbound.protocol.value,
        core=inbound.core.value,
        transport_config=inbound.transport_config,
        port=inbound.port,
        connection_mode=inbound.connection_mode.value,
        tag=inbound.tag,
        max_connections=inbound.max_connections,
        sniffing=inbound.sniffing,
        is_active=inbound.is_active,
        created_at=inbound.created_at,
    )


@router.get("/", response_model=InboundListResponse)
async def list_inbounds(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    node_id: uuid.UUID | None = Query(None),
    protocol: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = InboundService(db)
    inbounds, total = await service.list_inbounds(
        skip=skip, limit=limit, node_id=node_id, protocol=protocol
    )
    return InboundListResponse(
        items=[_inbound_to_response(i) for i in inbounds],
        total=total,
    )


@router.post("/", response_model=InboundResponse, status_code=201)
async def create_inbound(
    body: InboundCreate,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = InboundService(db)
    inbound = await service.create_inbound(body.model_dump())
    return _inbound_to_response(inbound)


@router.get("/{inbound_id}", response_model=InboundResponse)
async def get_inbound(
    inbound_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = InboundService(db)
    inbound = await service.get_inbound(inbound_id)
    return _inbound_to_response(inbound)


@router.put("/{inbound_id}", response_model=InboundResponse)
async def update_inbound(
    inbound_id: uuid.UUID,
    body: InboundUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = InboundService(db)
    inbound = await service.update_inbound(
        inbound_id, body.model_dump(exclude_unset=True)
    )
    return _inbound_to_response(inbound)


@router.delete("/{inbound_id}", status_code=204)
async def delete_inbound(
    inbound_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
):
    service = InboundService(db)
    await service.delete_inbound(inbound_id)
