from pydantic import BaseModel


class ConfigMatrixEntry(BaseModel):
    protocol: str
    transport: str
    security: str
    connection_modes: list[str]
    core: str
    region_support: dict[str, str]  # region -> "recommended" | "available" | "avoid"


class ConfigMatrixResponse(BaseModel):
    configs: list[ConfigMatrixEntry]


class GeneratedConfig(BaseModel):
    """A generated config for one user + one inbound."""
    inbound_id: str
    node_name: str
    protocol: str
    transport: str
    security: str
    connection_mode: str
    uri: str
    remark: str


class UserConfigsResponse(BaseModel):
    user_id: str
    username: str
    configs: list[GeneratedConfig]


class RegionProfileInfo(BaseModel):
    name: str
    description: str
    recommended: list[str]
    avoid: list[str] = []
    fallback: list[str] = []
    notes: str = ""


class RegionProfilesResponse(BaseModel):
    profiles: dict[str, RegionProfileInfo]
