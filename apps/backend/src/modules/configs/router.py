"""Config Generator API — matrix, region profiles, user configs."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.auth.dependencies import get_current_admin
from src.modules.configs.schemas import (
    ConfigMatrixEntry,
    ConfigMatrixResponse,
    GeneratedConfig,
    RegionProfileInfo,
    RegionProfilesResponse,
    UserConfigsResponse,
)
from src.modules.configs.service import ConfigService

router = APIRouter()


@router.get("/matrix", response_model=ConfigMatrixResponse)
async def get_config_matrix(
    _admin=Depends(get_current_admin),
):
    """Return the full protocol/transport/security matrix with region support."""
    matrix = ConfigService.get_config_matrix()
    entries = [
        ConfigMatrixEntry(
            protocol=m["protocol"],
            transport=m["transport"],
            security=m["security"],
            connection_modes=m["connection_modes"],
            core=m["core"],
            region_support=m["region_support"],
        )
        for m in matrix
    ]
    return ConfigMatrixResponse(configs=entries)


@router.get("/regions", response_model=RegionProfilesResponse)
async def get_region_profiles(
    _admin=Depends(get_current_admin),
):
    """Return all regional profiles with recommendations."""
    profiles = ConfigService.get_region_profiles()
    return RegionProfilesResponse(
        profiles={
            k: RegionProfileInfo(**v) for k, v in profiles.items()
        }
    )


@router.get("/user/{user_id}", response_model=UserConfigsResponse)
async def get_user_configs(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Generate all client configs for a specific user."""
    configs = await ConfigService.generate_user_configs(db, user_id)
    if not configs:
        raise HTTPException(status_code=404, detail="User not found or no configs available")

    return UserConfigsResponse(
        user_id=str(user_id),
        username="",  # Will be populated from DB
        configs=[GeneratedConfig(**c) for c in configs],
    )
