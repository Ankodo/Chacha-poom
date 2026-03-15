"""Aiogram middlewares: throttling and logging."""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update, Message, CallbackQuery

from src.config import settings

logger = logging.getLogger(__name__)


class ThrottlingMiddleware(BaseMiddleware):
    """
    Simple per-user throttle: drop updates if the user sends messages
    faster than ``settings.THROTTLE_RATE`` seconds apart.
    """

    def __init__(self, rate: float | None = None) -> None:
        super().__init__()
        self._rate = rate or settings.THROTTLE_RATE
        self._last: dict[int, float] = defaultdict(float)

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user_id = self._extract_user_id(event)
        if user_id is not None:
            now = time.monotonic()
            if now - self._last[user_id] < self._rate:
                logger.debug("Throttled user %s", user_id)
                return None  # silently drop
            self._last[user_id] = now

        return await handler(event, data)

    @staticmethod
    def _extract_user_id(event: TelegramObject) -> int | None:
        if isinstance(event, Message) and event.from_user:
            return event.from_user.id
        if isinstance(event, CallbackQuery) and event.from_user:
            return event.from_user.id
        return None


class LoggingMiddleware(BaseMiddleware):
    """Log every incoming update for debugging / audit."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if isinstance(event, Message):
            user = event.from_user
            logger.info(
                "[msg] user=%s (%s) text=%s",
                user.id if user else "?",
                user.username if user else "?",
                (event.text or "")[:80],
            )
        elif isinstance(event, CallbackQuery):
            user = event.from_user
            logger.info(
                "[cb] user=%s (%s) data=%s",
                user.id if user else "?",
                user.username if user else "?",
                event.data,
            )

        return await handler(event, data)
