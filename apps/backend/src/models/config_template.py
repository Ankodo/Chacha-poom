import uuid
from datetime import UTC, datetime

from sqlalchemy import String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class ConfigTemplate(Base):
    __tablename__ = "config_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    protocol: Mapped[str] = mapped_column(String(30), nullable=False)
    core: Mapped[str] = mapped_column(String(10), nullable=False)
    transport: Mapped[str] = mapped_column(String(20), nullable=False)
    security: Mapped[str] = mapped_column(String(20), nullable=False)
    connection_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    server_template: Mapped[dict] = mapped_column(JSON, nullable=False)
    client_template: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
