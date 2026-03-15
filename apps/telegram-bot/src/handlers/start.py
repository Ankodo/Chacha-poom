"""/start command handler — registration and main menu."""

from __future__ import annotations

import logging

from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery

from src.api import api, APIError
from src.keyboards import main_menu

router = Router()
logger = logging.getLogger(__name__)

WELCOME_NEW = (
    "\U0001f680 <b>\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 ProxyForge!</b>\n\n"
    "\u0412\u0430\u0448 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0441\u043e\u0437\u0434\u0430\u043d.\n"
    "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0432 \u043c\u0435\u043d\u044e \u043d\u0438\u0436\u0435:"
)

WELCOME_EXISTING = (
    "\U0001f44b <b>\u0421 \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0435\u043d\u0438\u0435\u043c, {name}!</b>\n\n"
    "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435:"
)


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    user = message.from_user
    if user is None:
        return

    try:
        result = await api.login_telegram(
            telegram_id=user.id,
            telegram_username=user.username,
        )
        # Store token in bot data for this user (simple in-memory cache)
        # In production you'd use Redis or a DB
        _token_cache[user.id] = result.get("access_token", "")

        is_new = result.get("is_new", False)
        if is_new:
            text = WELCOME_NEW
        else:
            name = user.first_name or user.username or "\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c"
            text = WELCOME_EXISTING.format(name=name)

    except APIError as e:
        logger.error("login_telegram failed: %s", e)
        text = (
            "\u274c <b>\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f \u043a \u0441\u0435\u0440\u0432\u0435\u0440\u0443.</b>\n"
            "\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435 \u0438\u043b\u0438 \u043e\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044c \u0432 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0443."
        )

    await message.answer(text, reply_markup=main_menu(), parse_mode="HTML")


@router.callback_query(F.data == "back_menu")
async def cb_back_menu(callback: CallbackQuery) -> None:
    """Return to the main menu from any sub-screen."""
    await callback.answer()
    name = ""
    if callback.from_user:
        name = callback.from_user.first_name or callback.from_user.username or ""
    text = f"\U0001f3e0 <b>\u0413\u043b\u0430\u0432\u043d\u043e\u0435 \u043c\u0435\u043d\u044e</b>"
    if callback.message:
        await callback.message.edit_text(text, reply_markup=main_menu(), parse_mode="HTML")


# ── Token cache (simple in-memory) ────────────────────────────────

_token_cache: dict[int, str] = {}


def get_token(user_id: int) -> str | None:
    """Retrieve the cached access token for a Telegram user."""
    return _token_cache.get(user_id)


async def ensure_token(user_id: int, username: str | None = None) -> str | None:
    """Get token from cache, or re-login if missing."""
    token = _token_cache.get(user_id)
    if token:
        return token
    try:
        result = await api.login_telegram(user_id, username)
        token = result.get("access_token", "")
        _token_cache[user_id] = token
        return token
    except APIError:
        return None
