from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.inbound import Inbound
from src.models.node import Node, NodeStatus
from src.models.subscription import Subscription, SubStatus
from src.models.user import User
from src.models.user_traffic import UserTraffic


class StatsService:

    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> dict:
        # Total users
        total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

        # Active subscriptions
        active_subs = (await db.execute(
            select(func.count(Subscription.id)).where(Subscription.status == SubStatus.ACTIVE)
        )).scalar() or 0

        expired_subs = (await db.execute(
            select(func.count(Subscription.id)).where(Subscription.status == SubStatus.EXPIRED)
        )).scalar() or 0

        # Nodes
        total_nodes = (await db.execute(select(func.count(Node.id)))).scalar() or 0
        online_nodes = (await db.execute(
            select(func.count(Node.id)).where(Node.status == NodeStatus.ONLINE)
        )).scalar() or 0

        # Inbounds
        total_inbounds = (await db.execute(
            select(func.count(Inbound.id)).where(Inbound.is_active.is_(True))
        )).scalar() or 0

        # Total traffic
        total_traffic = (await db.execute(
            select(func.coalesce(func.sum(Subscription.traffic_used), 0))
        )).scalar() or 0

        return {
            "total_users": total_users,
            "active_users": active_subs,
            "expired_users": expired_subs,
            "total_nodes": total_nodes,
            "online_nodes": online_nodes,
            "total_inbounds": total_inbounds,
            "total_traffic_bytes": total_traffic,
            "active_subscriptions": active_subs,
        }

    @staticmethod
    async def get_user_stats(db: AsyncSession) -> dict:
        now = datetime.now(UTC)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)

        total = (await db.execute(select(func.count(User.id)))).scalar() or 0

        active = (await db.execute(
            select(func.count(Subscription.id)).where(Subscription.status == SubStatus.ACTIVE)
        )).scalar() or 0

        expired = (await db.execute(
            select(func.count(Subscription.id)).where(Subscription.status == SubStatus.EXPIRED)
        )).scalar() or 0

        disabled = (await db.execute(
            select(func.count(Subscription.id)).where(Subscription.status == SubStatus.DISABLED)
        )).scalar() or 0

        new_today = (await db.execute(
            select(func.count(User.id)).where(User.created_at >= today_start)
        )).scalar() or 0

        new_week = (await db.execute(
            select(func.count(User.id)).where(User.created_at >= week_start)
        )).scalar() or 0

        new_month = (await db.execute(
            select(func.count(User.id)).where(User.created_at >= month_start)
        )).scalar() or 0

        return {
            "total": total,
            "active": active,
            "expired": expired,
            "disabled": disabled,
            "new_today": new_today,
            "new_this_week": new_week,
            "new_this_month": new_month,
        }

    @staticmethod
    async def get_traffic_stats(db: AsyncSession, period: str = "24h") -> dict:
        now = datetime.now(UTC)

        if period == "24h":
            since = now - timedelta(hours=24)
        elif period == "7d":
            since = now - timedelta(days=7)
        elif period == "30d":
            since = now - timedelta(days=30)
        else:
            since = now - timedelta(hours=24)

        # Traffic by node
        node_traffic_result = await db.execute(
            select(
                UserTraffic.node_id,
                func.sum(UserTraffic.upload).label("upload"),
                func.sum(UserTraffic.download).label("download"),
            )
            .where(UserTraffic.timestamp >= since)
            .group_by(UserTraffic.node_id)
        )
        by_node = [
            {"node_id": str(r.node_id), "upload": r.upload or 0, "download": r.download or 0}
            for r in node_traffic_result.all()
        ]

        # Traffic by inbound (protocol)
        protocol_traffic_result = await db.execute(
            select(
                UserTraffic.inbound_id,
                func.sum(UserTraffic.upload).label("upload"),
                func.sum(UserTraffic.download).label("download"),
            )
            .where(UserTraffic.timestamp >= since)
            .group_by(UserTraffic.inbound_id)
        )
        by_protocol = [
            {"inbound_id": str(r.inbound_id), "upload": r.upload or 0, "download": r.download or 0}
            for r in protocol_traffic_result.all()
        ]

        total_up = sum(n["upload"] for n in by_node)
        total_down = sum(n["download"] for n in by_node)

        return {
            "period": period,
            "total_upload": total_up,
            "total_download": total_down,
            "by_node": by_node,
            "by_protocol": by_protocol,
        }
