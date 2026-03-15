from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    expired_users: int
    total_nodes: int
    online_nodes: int
    total_inbounds: int
    total_traffic_bytes: int
    active_subscriptions: int


class TrafficStats(BaseModel):
    period: str  # "24h", "7d", "30d"
    total_upload: int
    total_download: int
    by_node: list[dict]
    by_protocol: list[dict]


class UserStats(BaseModel):
    total: int
    active: int
    expired: int
    disabled: int
    new_today: int
    new_this_week: int
    new_this_month: int
