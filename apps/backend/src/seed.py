"""Seed script to create initial SuperAdmin account."""
import asyncio
import os

from sqlalchemy import select

from src.core.database import async_session, engine, Base
from src.core.security import hash_password
from src.models.admin import Admin, AdminRole
from src.core.logging import logger


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    username = os.getenv("SUPERADMIN_USERNAME", "admin")
    password = os.getenv("SUPERADMIN_PASSWORD", "admin")

    async with async_session() as session:
        result = await session.execute(select(Admin).where(Admin.username == username))
        existing = result.scalar_one_or_none()

        if existing:
            logger.info("SuperAdmin already exists", username=username)
            return

        admin = Admin(
            username=username,
            password_hash=hash_password(password),
            role=AdminRole.SUPERADMIN,
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        logger.info("SuperAdmin created", username=username)


if __name__ == "__main__":
    asyncio.run(seed())
