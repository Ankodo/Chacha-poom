import uuid
from datetime import UTC, datetime
import enum

from sqlalchemy import BigInteger, String, Enum as SAEnum, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class SubStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    DISABLED = "disabled"
    LIMITED = "limited"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plans.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[SubStatus] = mapped_column(SAEnum(SubStatus), default=SubStatus.ACTIVE)
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    expiry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    traffic_limit: Mapped[int] = mapped_column(BigInteger, default=0)  # bytes, 0 = unlimited
    traffic_used: Mapped[int] = mapped_column(BigInteger, default=0)
    device_limit: Mapped[int] = mapped_column(Integer, default=0)  # 0 = unlimited

    # Relationships
    user: Mapped["User"] = relationship(back_populates="subscription")  # type: ignore[name-defined]  # noqa: F821
    plan: Mapped["Plan | None"] = relationship()  # type: ignore[name-defined]  # noqa: F821
