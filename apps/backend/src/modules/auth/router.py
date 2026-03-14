from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.admin import Admin
from src.modules.auth.dependencies import get_current_admin
from src.modules.auth.schemas import (
    AdminResponse,
    LoginRequest,
    RefreshRequest,
    TotpSetupResponse,
    TotpVerifyRequest,
    TokenResponse,
)
from src.modules.auth.service import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    admin = await service.authenticate(body.username, body.password)
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return service.create_tokens(admin)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.refresh_tokens(body.refresh_token)


@router.get("/me", response_model=AdminResponse)
async def me(admin: Admin = Depends(get_current_admin)):
    return AdminResponse(
        id=admin.id,
        username=admin.username,
        role=admin.role,
        is_active=admin.is_active,
        has_2fa=admin.totp_secret is not None,
        created_at=admin.created_at,
    )


@router.post("/2fa/setup", response_model=TotpSetupResponse)
async def setup_2fa(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    return await service.setup_totp(admin.id)


@router.post("/2fa/verify")
async def verify_2fa(
    body: TotpVerifyRequest,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    valid = await service.verify_totp(admin.id, body.code)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code",
        )
    return {"detail": "2FA code verified successfully"}
