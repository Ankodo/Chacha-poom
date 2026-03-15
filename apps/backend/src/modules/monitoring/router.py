import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.models.admin import Admin
from src.models.inbound import Inbound
from src.models.node import Node
from src.modules.auth.dependencies import get_current_admin
from src.modules.monitoring.schemas import (
    AlertsResponse,
    NodeEvent,
    NodeHeartbeat,
    NodeMetricsResponse,
    TrafficReport,
)
from src.modules.monitoring.service import MonitoringService

# ── Node agent auth ─────────────────────────────────────────────

bearer_scheme = HTTPBearer()


async def get_node_by_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Node:
    """Validate the node agent token from the Authorization header."""
    token = credentials.credentials
    result = await db.execute(select(Node).where(Node.agent_token == token))
    node = result.scalar_one_or_none()
    if node is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid node agent token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return node


# ── Node agent router ──────────────────────────────────────────

node_router = APIRouter()


@node_router.post("/heartbeat")
async def receive_heartbeat(
    heartbeat: NodeHeartbeat,
    node: Node = Depends(get_node_by_token),
    db: AsyncSession = Depends(get_db),
):
    """Receive heartbeat from node agent."""
    service = MonitoringService(db)
    await service.process_heartbeat(node.id, heartbeat)
    return {"status": "ok"}


@node_router.post("/traffic")
async def receive_traffic(
    report: TrafficReport,
    node: Node = Depends(get_node_by_token),
    db: AsyncSession = Depends(get_db),
):
    """Receive traffic report from node agent."""
    service = MonitoringService(db)
    count = await service.process_traffic_report(node.id, report)
    return {"status": "ok", "processed": count}


@node_router.get("/config")
async def get_node_config(
    node: Node = Depends(get_node_by_token),
    db: AsyncSession = Depends(get_db),
):
    """Node fetches its configuration (all active inbounds)."""
    result = await db.execute(
        select(Inbound).where(Inbound.node_id == node.id, Inbound.is_active.is_(True))
    )
    inbounds = result.scalars().all()

    return {
        "node_id": str(node.id),
        "name": node.name,
        "cores_config": node.cores_config,
        "inbounds": [
            {
                "id": str(ib.id),
                "protocol": ib.protocol.value,
                "core": ib.core.value,
                "port": ib.port,
                "tag": ib.tag,
                "transport_config": ib.transport_config,
                "connection_mode": ib.connection_mode.value,
                "sniffing": ib.sniffing,
                "fallback_config": ib.fallback_config,
            }
            for ib in inbounds
        ],
    }


@node_router.post("/event")
async def receive_event(
    event: NodeEvent,
    node: Node = Depends(get_node_by_token),
    db: AsyncSession = Depends(get_db),
):
    """Node reports events (user connect/disconnect, etc.)."""
    # For now, just acknowledge the event. Future: persist to event log, trigger webhooks.
    return {
        "status": "ok",
        "node_id": str(node.id),
        "event_type": event.type,
    }


# ── Admin router ────────────────────────────────────────────────

admin_router = APIRouter()


@admin_router.get("/alerts", response_model=AlertsResponse)
async def get_alerts(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get all active alerts across nodes."""
    service = MonitoringService(db)
    alerts = await service.check_alerts()
    return AlertsResponse(alerts=alerts, total=len(alerts))


@admin_router.get("/nodes/{node_id}/metrics", response_model=NodeMetricsResponse)
async def get_node_metrics(
    node_id: uuid.UUID,
    period: str = "24h",
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get time-series metrics for a specific node."""
    # Verify node exists
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    if period not in ("1h", "6h", "24h", "7d", "30d"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid period. Allowed: 1h, 6h, 24h, 7d, 30d",
        )

    service = MonitoringService(db)
    metrics = await service.get_node_metrics(node_id, period)
    return NodeMetricsResponse(node_id=node_id, period=period, metrics=metrics)
