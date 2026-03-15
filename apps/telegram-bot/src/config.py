from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Telegram Bot
    BOT_TOKEN: str = ""

    # ProxyForge Backend
    API_URL: str = "http://localhost:8000"

    # Sub-link domain (for generating subscription links)
    SUB_DOMAIN: str = "sub.localhost"

    # Admin Telegram IDs (comma-separated in env, parsed as list)
    ADMIN_IDS: list[int] = []

    # Throttle rate (seconds between messages per user)
    THROTTLE_RATE: float = 1.0


settings = Settings()
