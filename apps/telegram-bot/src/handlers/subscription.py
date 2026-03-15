"""/status command and 'My Subscription' button handler."""

from __future__ import annotations

import logging
from datetime import datetime

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery

from src.api import api, APIError
from src.handlers.start import ensure_token
from src.keyboards import main_menu, back_menu_keyboard

router = Router()
logger = logging.getLogger(__name__)


def _format_traffic(value: int) -> str:
    """Format bytes to human-readable string."""
    if value == 0:
        return "\u221e"
    gb = value / (1024 ** 3)
    if gb >= 1:
        return f"{gb:.1f} GB"
    mb = value / (1024 ** 2)
    return f"{mb:.0f} MB"


def _format_subscription(profile: dict) -> str:
    """Build the subscription info message."""
    sub = profile.get("subscription")
    username = profile.get("username", "\u2014")

    if not sub:
        return (
            "\U0001f4cb <b>\u041c\u043e\u044f \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0430</b>\n\n"
            f"\U0001f464 \u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c: <code>{username}</code>\n\n"
            "\u274c <b>\u041f\u043e\u0434\u043f\u0438\u0441\u043a\u0430 \u043d\u0435 \u0430\u043a\u0442\u0438\u0432\u043d\u0430.</b>\n"
            '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 "\U0001f4b3 \u041a\u0443\u043f\u0438\u0442\u044c" \u0434\u043b\u044f \u043e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u0438\u044f.'
        )

    plan_name = sub.get("plan_name", "\u2014")
    status_raw = sub.get("status", "unknown")
    status_map = {
        "active": "\u2705 \u0410\u043a\u0442\u0438\u0432\u043d\u0430",
        "expired": "\u274c \u0418\u0441\u0442\u0435\u043a\u043b\u0430",
        "disabled": "\u26d4 \u041e\u0442\u043a\u043b\u044e\u0447\u0435\u043d\u0430",
        "limited": "\u26a0\ufe0f \u041b\u0438\u043c\u0438\u0442 \u0438\u0441\u0447\u0435\u0440\u043f\u0430\u043d",
    }
    status_text = status_map.get(status_raw, status_raw)

    expiry_raw = sub.get("expiry_date", "")
    try:
        expiry = datetime.fromisoformat(expiry_raw.replace("Z", "+00:00"))
        expiry_str = expiry.strftime("%d.%m.%Y %H:%M")
        days_left = (expiry - datetime.now(expiry.tzinfo)).days
        expiry_str += f" ({days_left} \u0434\u043d.)" if days_left > 0 else " (\u0438\u0441\u0442\u0435\u043a\u043b\u0430)"
    except (ValueError, TypeError):
        expiry_str = expiry_raw or "\u2014"

    traffic_used = sub.get("traffic_used", 0)
    traffic_limit = sub.get("traffic_limit", 0)
    traffic_str = f"{_format_traffic(traffic_used)} / {_format_traffic(traffic_limit)}"

    device_limit = sub.get("device_limit", 0)
    device_str = str(device_limit) if device_limit > 0 else "\u221e"

    return (
        "\U0001f4cb <b>\u041c\u043e\u044f \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0430</b>\n\n"
        f"\U0001f464 \u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c: <code>{username}</code>\n"
        f"\U0001f4e6 \u0422\u0430\u0440\u0438\u0444: <b>{plan_name}</b>\n"
        f"\U0001f4ca \u0421\u0442\u0430\u0442\u0443\u0441: {status_text}\n"
        f"\U0001f4c5 \u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043e: {expiry_str}\n"
        f"\U0001f4c8 \u0422\u0440\u0430\u0444\u0438\u043a: {traffic_str}\n"
        f"\U0001f4f1 \u0423\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430: {device_str}"
    )


async def _show_subscription(user_id: int, username: str | None) -> tuple[str, any]:
    """Fetch profile and return formatted text + keyboard."""
    token = await ensure_token(user_id, username)
    if not token:
        return (
            "\u274c \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f. \u041d\u0430\u0436\u043c\u0438\u0442\u0435 /start",
            back_menu_keyboard(),
        )
    try:
        profile = await api.get_profile(token)
        text = _format_subscription(profile)
    except APIError as e:
        logger.error("get_profile failed: %s", e)
        text = "\u274c \u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435 \u043f\u0440\u043e\u0444\u0438\u043b\u044f. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435."
    return text, back_menu_keyboard()


@router.message(Command("status"))
async def cmd_status(message: Message) -> None:
    user = message.from_user
    if not user:
        return
    text, kb = await _show_subscription(user.id, user.username)
    await message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "subscription")
async def cb_subscription(callback: CallbackQuery) -> None:
    await callback.answer()
    user = callback.from_user
    if not user:
        return
    text, kb = await _show_subscription(user.id, user.username)
    if callback.message:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
