from pydantic import BaseModel


class PlanCreate(BaseModel):
    name: str
    price: float
    currency: str = "RUB"
    duration_days: int
    traffic_limit: int = 0  # bytes, 0 = unlimited
    device_limit: int = 0
    features: dict = {}
    sort_order: int = 0


class PlanUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    currency: str | None = None
    duration_days: int | None = None
    traffic_limit: int | None = None
    device_limit: int | None = None
    features: dict | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class PlanResponse(BaseModel):
    id: str
    name: str
    price: float
    currency: str
    duration_days: int
    traffic_limit: int
    device_limit: int
    features: dict
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True
