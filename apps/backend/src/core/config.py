from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "ProxyForge"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/proxyforge"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3001", "http://localhost:3002"]

    # Telegram Bot
    BOT_TOKEN: str = ""

    # Payments
    YUKASSA_SHOP_ID: str = ""
    YUKASSA_SECRET_KEY: str = ""
    CRYPTOBOT_TOKEN: str = ""

    # Sub-link
    SUB_DOMAIN: str = "sub.localhost"

    # Node Agent
    NODE_AGENT_SECRET: str = "change-me-node-secret"


settings = Settings()
