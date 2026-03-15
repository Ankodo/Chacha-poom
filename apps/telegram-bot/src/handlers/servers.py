"""/servers command — show server list with status."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from src.api import api, APIError
from src.keyboards import back_menu_keyboard, server_details_keyboard

router = Router()
logger = logging.getLogger(__name__)


def _format_server_list(servers: list[dict]) -> str:
    """Format server list into a readable message."""
    if not servers:
        return "\U0001f310 <b>\u0421\u0435\u0440\u0432\u0435\u0440\u044b</b>\n\n\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0445 \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u0432."

    lines = ["\U0001f310 <b>\u0421\u0435\u0440\u0432\u0435\u0440\u044b ProxyForge</b>\n"]

    for srv in servers:
        name = srv.get("name", "Server")
        country = srv.get("country", "XX")
        city = srv.get("city", "")
        flag = srv.get("flag", "") or _country_flag(country)
        status = srv.get("status", "unknown")

        status_icon = "\U0001f7e2" if status == "online" else "\U0001f534"
        status_text = "\u043e\u043d\u043b\u0430\u0439\u043d" if status == "online" else "\u043e\u0444\u0444\u043b\u0430\u0439\u043d"

        # Estimate ping based on last heartbeat
        heartbeat = srv.get("last_heartbeat")
        ping_str = ""
        if heartbeat and status == "online":
            try:
                hb_time = datetime.fromisoformat(heartbeat.replace("Z", "+00:00"))
                age_sec = (datetime.now(timezone.utc) - hb_time).total_seconds()
                if age_sec < 60:
                    ping_str = " | ~\u0431\u044b\u0441\u0442\u0440\u044b\u0439"
                elif age_sec < 300:
                    ping_str = " | ~\u043d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u044b\u0439"
                else:
                    ping_str = " | ~\u043c\u0435\u0434\u043b\u0435\u043d\u043d\u044b\u0439"
            except (ValueError, TypeError):
                pass

        location = f"{city}, {country}" if city else country
        lines.append(
            f"{status_icon} <b>{flag} {name}</b>\n"
            f"   \U0001f4cd {location} | {status_text}{ping_str}"
        )

    return "\n\n".join(lines)


def _format_server_detail(srv: dict) -> str:
    """Format a single server detail."""
    name = srv.get("name", "Server")
    country = srv.get("country", "XX")
    city = srv.get("city", "")
    flag = srv.get("flag", "") or _country_flag(country)
    status = srv.get("status", "unknown")
    status_icon = "\U0001f7e2" if status == "online" else "\U0001f534"
    status_text = "\u043e\u043d\u043b\u0430\u0439\u043d" if status == "online" else "\u043e\u0444\u0444\u043b\u0430\u0439\u043d"

    inbound_count = srv.get("inbound_count", 0)
    region_profile = srv.get("region_profile", "universal")

    location = f"{city}, {country}" if city else country

    return (
        f"{status_icon} <b>{flag} {name}</b>\n\n"
        f"\U0001f4cd \u041b\u043e\u043a\u0430\u0446\u0438\u044f: {location}\n"
        f"\U0001f4ca \u0421\u0442\u0430\u0442\u0443\u0441: {status_text}\n"
        f"\U0001f310 \u041f\u0440\u043e\u0444\u0438\u043b\u044c: {region_profile}\n"
        f"\u2699\ufe0f \u041f\u0440\u043e\u0442\u043e\u043a\u043e\u043b\u043e\u0432: {inbound_count}"
    )


def _country_flag(code: str) -> str:
    if len(code) != 2:
        return "\U0001f30d"
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in code.upper())


async def _fetch_and_show_servers() -> tuple[str, any]:
    """Fetch servers and return text + keyboard."""
    try:
        servers = await api.get_servers()
    except APIError as e:
        logger.error("get_servers failed: %s", e)
        return (
            "\u274c \u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u0432.",
            back_menu_keyboard(),
        )

    text = _format_server_list(servers)
    kb = server_details_keyboard(servers) if servers else back_menu_keyboard()
    return text, kb


@router.message(Command("servers"))
async def cmd_servers(message: Message) -> None:
    text, kb = await _fetch_and_show_servers()
    await message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "servers")
async def cb_servers(callback: CallbackQuery) -> None:
    await callback.answer()
    text, kb = await _fetch_and_show_servers()
    if callback.message:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data.startswith("srv:"))
async def cb_server_detail(callback: CallbackQuery) -> None:
    await callback.answer()
    server_id = callback.data.split(":", 1)[1]  # type: ignore[union-attr]

    try:
        servers = await api.get_servers()
        srv = next((s for s in servers if str(s.get("id")) == server_id), None)
    except APIError:
        srv = None

    if not srv:
        if callback.message:
            await callback.message.edit_text(
                "\u274c \u0421\u0435\u0440\u0432\u0435\u0440 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.",
                reply_markup=back_menu_keyboard(),
                parse_mode="HTML",
            )
        return

    text = _format_server_detail(srv)
    if callback.message:
        await callback.message.edit_text(
            text,
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
