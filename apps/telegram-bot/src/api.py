"""HTTP client for the ProxyForge backend API."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp

from src.config import settings

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Raised when the backend returns a non-2xx response."""

    def __init__(self, status: int, detail: str = "") -> None:
        self.status = status
        self.detail = detail
        super().__init__(f"API {status}: {detail}")


class ProxyForgeAPI:
    """Async client that talks to the ProxyForge backend."""

    def __init__(self) -> None:
        self._base = settings.API_URL.rstrip("/")
        self._session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
            )
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    # ── Low-level helpers ──────────────────────────────────────────

    async def _request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any] | list[Any]:
        session = await self._get_session()
        headers: dict[str, str] = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        url = f"{self._base}{path}"
        logger.debug("API %s %s", method, url)

        async with session.request(
            method, url, json=json, params=params, headers=headers
        ) as resp:
            if resp.status >= 400:
                try:
                    body = await resp.json()
                    detail = body.get("detail", str(body))
                except Exception:
                    detail = await resp.text()
                raise APIError(resp.status, detail)
            if resp.status == 204:
                return {}
            return await resp.json()

    async def _get(self, path: str, **kw: Any) -> Any:
        return await self._request("GET", path, **kw)

    async def _post(self, path: str, **kw: Any) -> Any:
        return await self._request("POST", path, **kw)

    # ── Telegram auth ─────────────────────────────────────────────

    async def login_telegram(
        self,
        telegram_id: int,
        telegram_username: str | None = None,
    ) -> dict[str, Any]:
        """
        Authenticate / register a Telegram user.
        The backend should have a /api/telegram/auth endpoint that:
         - finds or creates a user by telegram_id
         - returns { access_token, user_id, is_new }
        """
        return await self._post(
            "/api/telegram/auth",
            json={
                "telegram_id": telegram_id,
                "telegram_username": telegram_username or "",
            },
        )

    # ── User profile ──────────────────────────────────────────────

    async def get_profile(self, token: str) -> dict[str, Any]:
        """Get the current user's profile and subscription info."""
        return await self._get("/api/telegram/me", token=token)

    # ── Configs ───────────────────────────────────────────────────

    async def get_configs(self, token: str) -> list[dict[str, Any]]:
        """Get all generated configs for the current user."""
        data = await self._get("/api/telegram/configs", token=token)
        if isinstance(data, dict):
            return data.get("configs", [])
        return data

    # ── Servers / Nodes ───────────────────────────────────────────

    async def get_servers(self) -> list[dict[str, Any]]:
        """Get the public server list with status info."""
        data = await self._get("/api/telegram/servers")
        if isinstance(data, dict):
            return data.get("items", [])
        return data

    # ── Plans ─────────────────────────────────────────────────────

    async def get_plans(self) -> list[dict[str, Any]]:
        """Get active subscription plans."""
        data = await self._get("/api/telegram/plans")
        if isinstance(data, list):
            return data
        return data.get("items", [])

    # ── Payments ──────────────────────────────────────────────────

    async def create_payment(
        self,
        token: str,
        plan_id: str,
        provider: str,
    ) -> dict[str, Any]:
        """
        Create a payment for the given plan.
        Returns { payment_url, payment_id } or instructions for manual payment.
        """
        return await self._post(
            "/api/telegram/payments",
            token=token,
            json={
                "plan_id": plan_id,
                "provider": provider,
            },
        )


# Singleton instance
api = ProxyForgeAPI()
