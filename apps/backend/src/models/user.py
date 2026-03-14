import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, unique=True)
    telegram_username: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Sub-link token
    sub_token: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    created_by: Mapped[str] = mapped_column(String(100), default="admin")

    # Relationships
    subscription: Mapped["Subscription | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")  # type: ignore[name-defined]  # noqa: F821
    access_rules: Mapped[list["UserAccess"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # type: ignore[name-defined]  # noqa: F821
    payments: Mapped[list["Payment"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # type: ignore[name-defined]  # noqa: F821
