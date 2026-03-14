import uuid

import pyotp
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from src.models.admin import Admin
from src.modules.auth.schemas import TokenResponse, TotpSetupResponse


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def authenticate(self, username: str, password: str) -> Admin | None:
        result = await self.db.execute(
            select(Admin).where(Admin.username == username)
        )
        admin = result.scalar_one_or_none()
        if admin is None or not verify_password(password, admin.password_hash):
            return None
        return admin

    def create_tokens(self, admin: Admin) -> TokenResponse:
        token_data = {"sub": str(admin.id), "role": admin.role.value}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload is None or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        admin_id = payload.get("sub")
        if admin_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        result = await self.db.execute(
            select(Admin).where(Admin.id == uuid.UUID(admin_id))
        )
        admin = result.scalar_one_or_none()
        if admin is None or not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin not found or inactive",
            )

        return self.create_tokens(admin)

    async def setup_totp(self, admin_id: uuid.UUID) -> TotpSetupResponse:
        result = await self.db.execute(
            select(Admin).where(Admin.id == admin_id)
        )
        admin = result.scalar_one_or_none()
        if admin is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found",
            )

        secret = pyotp.random_base32()
        totp = pyotp.totp.TOTP(secret)
        qr_uri = totp.provisioning_uri(
            name=admin.username, issuer_name="ProxyForge"
        )

        admin.totp_secret = secret
        await self.db.flush()

        return TotpSetupResponse(secret=secret, qr_uri=qr_uri)

    async def verify_totp(self, admin_id: uuid.UUID, code: str) -> bool:
        result = await self.db.execute(
            select(Admin).where(Admin.id == admin_id)
        )
        admin = result.scalar_one_or_none()
        if admin is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found",
            )

        if admin.totp_secret is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA is not set up for this account",
            )

        totp = pyotp.totp.TOTP(admin.totp_secret)
        return totp.verify(code)

    async def get_current_admin(self, token: str) -> Admin:
        payload = decode_token(token)
        if payload is None or payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token",
            )

        admin_id = payload.get("sub")
        if admin_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        result = await self.db.execute(
            select(Admin).where(Admin.id == uuid.UUID(admin_id))
        )
        admin = result.scalar_one_or_none()
        if admin is None or not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin not found or inactive",
            )

        return admin
