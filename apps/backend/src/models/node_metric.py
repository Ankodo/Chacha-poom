import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, Float, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class NodeMetric(Base):
    __tablename__ = "node_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    cpu: Mapped[float] = mapped_column(Float, default=0.0)
    ram: Mapped[float] = mapped_column(Float, default=0.0)
    bandwidth_up: Mapped[int] = mapped_column(BigInteger, default=0)
    bandwidth_down: Mapped[int] = mapped_column(BigInteger, default=0)
    connections: Mapped[int] = mapped_column(Integer, default=0)
