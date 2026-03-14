import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from src.models.admin import AdminRole


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class TotpSetupResponse(BaseModel):
    secret: str
    qr_uri: str


class TotpVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class AdminResponse(BaseModel):
    id: uuid.UUID
    username: str
    role: AdminRole
    is_active: bool
    has_2fa: bool
    created_at: datetime

    model_config = {"from_attributes": True}
