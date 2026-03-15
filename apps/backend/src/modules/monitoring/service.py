import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.node import Node, NodeStatus
from src.models.node_metric import NodeMetric
from src.models.subscription import Subscription
from src.models.user_traffic import UserTraffic
from src.modules.monitoring.schemas import (
    Alert,
    AlertConfig,
    AlertSeverity,
    AlertType,
    MetricPoint,
    NodeHeartbeat,
    TrafficReport,
)


class MonitoringService:
    """Handles heartbeats, traffic reports, and alert evaluation."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.alert_config = AlertConfig()

    # ── Heartbeat ───────────────────────────────────────────────

    async def process_heartbeat(
        self, node_id: uuid.UUID, heartbeat: NodeHeartbeat
    ) -> NodeMetric:
        """Persist metrics row and refresh node status / last_heartbeat."""
        metric = NodeMetric(
            node_id=node_id,
            cpu=heartbeat.cpu_usage,
            ram=heartbeat.ram_usage,
            bandwidth_up=heartbeat.bandwidth_up,
            bandwidth_down=heartbeat.bandwidth_down,
            connections=heartbeat.active_connections,
        )
        self.db.add(metric)

        # Determine status based on heartbeat data
        new_status = NodeStatus.ONLINE
        if heartbeat.cpu_usage >= self.alert_config.cpu_threshold or \
           heartbeat.ram_usage >= self.alert_config.ram_threshold:
            new_status = NodeStatus.DEGRADED

        await self.db.execute(
            update(Node)
            .where(Node.id == node_id)
            .values(
                status=new_status,
                last_heartbeat=datetime.now(UTC),
            )
        )
        await self.db.flush()
        return metric

    # ── Traffic ─────────────────────────────────────────────────

    async def process_traffic_report(
        self, node_id: uuid.UUID, report: TrafficReport
    ) -> int:
        """Save traffic entries and update subscription traffic_used.

        Returns the number of entries processed.
        """
        now = datetime.now(UTC)
        for entry in report.entries:
            traffic = UserTraffic(
                user_id=entry.user_id,
                node_id=node_id,
                inbound_id=entry.inbound_id,
                upload=entry.upload,
                download=entry.download,
                timestamp=now,
            )
            self.db.add(traffic)

            # Increment subscription traffic_used
            total_bytes = entry.upload + entry.download
            if total_bytes > 0:
                await self.db.execute(
                    update(Subscription)
                    .where(Subscription.user_id == entry.user_id)
                    .values(traffic_used=Subscription.traffic_used + total_bytes)
                )

        await self.db.flush()
        return len(report.entries)

    # ── Alerts ──────────────────────────────────────────────────

    async def check_alerts(self) -> list[Alert]:
        """Evaluate all nodes and return active alert list."""
        alerts: list[Alert] = []
        now = datetime.now(UTC)
        offline_threshold = now - timedelta(minutes=self.alert_config.node_offline_minutes)

        result = await self.db.execute(
            select(Node).where(Node.status != NodeStatus.MAINTENANCE)
        )
        nodes = result.scalars().all()

        for node in nodes:
            # Node offline check
            if node.last_heartbeat is None or node.last_heartbeat < offline_threshold:
                alerts.append(
                    Alert(
                        id=uuid.uuid4(),
                        type=AlertType.NODE_OFFLINE,
                        node_id=node.id,
                        message=f"Node '{node.name}' has been offline for more than "
                                f"{self.alert_config.node_offline_minutes} minutes",
                        severity=AlertSeverity.CRITICAL,
                        created_at=now,
                    )
                )
                continue  # skip metric checks for offline nodes

            # Get latest metric for this node
            metric_result = await self.db.execute(
                select(NodeMetric)
                .where(NodeMetric.node_id == node.id)
                .order_by(NodeMetric.timestamp.desc())
                .limit(1)
            )
            latest = metric_result.scalar_one_or_none()
            if latest is None:
                continue

            # High CPU
            if latest.cpu >= self.alert_config.cpu_threshold:
                alerts.append(
                    Alert(
                        id=uuid.uuid4(),
                        type=AlertType.HIGH_CPU,
                        node_id=node.id,
                        message=f"Node '{node.name}' CPU at {latest.cpu:.1f}%",
                        severity=AlertSeverity.WARNING,
                        created_at=now,
                    )
                )

            # High RAM
            if latest.ram >= self.alert_config.ram_threshold:
                alerts.append(
                    Alert(
                        id=uuid.uuid4(),
                        type=AlertType.HIGH_RAM,
                        node_id=node.id,
                        message=f"Node '{node.name}' RAM at {latest.ram:.1f}%",
                        severity=AlertSeverity.WARNING,
                        created_at=now,
                    )
                )

        return alerts

    # ── Metrics history ─────────────────────────────────────────

    async def get_node_metrics(
        self, node_id: uuid.UUID, period: str = "24h"
    ) -> list[MetricPoint]:
        """Return time-series metrics for the given node.

        Supported periods: '1h', '6h', '24h', '7d', '30d'.
        """
        period_map: dict[str, timedelta] = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
        }
        delta = period_map.get(period, timedelta(hours=24))
        since = datetime.now(UTC) - delta

        result = await self.db.execute(
            select(NodeMetric)
            .where(NodeMetric.node_id == node_id, NodeMetric.timestamp >= since)
            .order_by(NodeMetric.timestamp.asc())
        )
        rows = result.scalars().all()
        return [
            MetricPoint(
                timestamp=r.timestamp,
                cpu=r.cpu,
                ram=r.ram,
                bandwidth_up=r.bandwidth_up,
                bandwidth_down=r.bandwidth_down,
                connections=r.connections,
            )
            for r in rows
        ]
