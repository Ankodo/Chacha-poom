"""Create initial SuperAdmin account."""

import asyncio
import os
import sys

# Add parent dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy import select

from src.core.database import async_session
from src.core.security import hash_password
from src.models.admin import Admin


async def create_superadmin():
    username = os.environ.get("SUPERADMIN_USERNAME", "admin")
    password = os.environ.get("SUPERADMIN_PASSWORD")

    if not password:
        print("ERROR: SUPERADMIN_PASSWORD environment variable is required")
        sys.exit(1)

    async with async_session() as db:
        # Check if already exists
        result = await db.execute(
            select(Admin).where(Admin.username == username)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"SuperAdmin '{username}' already exists. Skipping.")
            return

        admin = Admin(
            username=username,
            password_hash=hash_password(password),
            role="superadmin",
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"SuperAdmin '{username}' created successfully!")


if __name__ == "__main__":
    asyncio.run(create_superadmin())
