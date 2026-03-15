"""Inline keyboards for the ProxyForge Telegram bot."""

from __future__ import annotations

from typing import Any

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


# ── Static keyboards ──────────────────────────────────────────────

def main_menu() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="\U0001f4cb \u041c\u043e\u044f \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0430", callback_data="subscription"),
        InlineKeyboardButton(text="\u2699\ufe0f \u041f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043a\u043e\u043d\u0444\u0438\u0433", callback_data="configs"),
    )
    builder.row(
        InlineKeyboardButton(text="\U0001f310 \u0421\u0435\u0440\u0432\u0435\u0440\u044b", callback_data="servers"),
        InlineKeyboardButton(text="\U0001f4b3 \u041a\u0443\u043f\u0438\u0442\u044c", callback_data="buy"),
    )
    builder.row(
        InlineKeyboardButton(text="\u2753 \u041f\u043e\u043c\u043e\u0449\u044c", callback_data="help"),
    )
    return builder.as_markup()


def protocols_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    protocols = [
        ("VLESS Reality", "proto:vless_reality"),
        ("VLESS CDN", "proto:vless_cdn"),
        ("Trojan CDN", "proto:trojan_cdn"),
        ("Hysteria2", "proto:hysteria2"),
    ]
    for name, cb_data in protocols:
        builder.row(InlineKeyboardButton(text=name, callback_data=cb_data))
    builder.row(back_button())
    return builder.as_markup()


def payment_methods_keyboard(plan_id: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    methods = [
        ("\U0001f4b3 YooKassa", f"pay:{plan_id}:yookassa"),
        ("\U0001f4b0 CryptoBot", f"pay:{plan_id}:cryptobot"),
        ("\u270d\ufe0f \u0420\u0443\u0447\u043d\u0430\u044f \u043e\u043f\u043b\u0430\u0442\u0430", f"pay:{plan_id}:manual"),
    ]
    for text, cb_data in methods:
        builder.row(InlineKeyboardButton(text=text, callback_data=cb_data))
    builder.row(back_button())
    return builder.as_markup()


def back_button() -> InlineKeyboardButton:
    return InlineKeyboardButton(
        text="\u25c0\ufe0f \u041d\u0430\u0437\u0430\u0434 \u0432 \u043c\u0435\u043d\u044e",
        callback_data="back_menu",
    )


def back_menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[back_button()]])


# ── Dynamic keyboards ─────────────────────────────────────────────

def plans_keyboard(plans: list[dict[str, Any]]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for plan in plans:
        price = plan.get("price", 0)
        currency = plan.get("currency", "RUB")
        duration = plan.get("duration_days", 30)
        name = plan.get("name", "Plan")
        traffic = plan.get("traffic_limit", 0)

        traffic_str = "\u221e" if traffic == 0 else f"{traffic // (1024 ** 3)} GB"
        label = f"{name} \u2014 {price:.0f} {currency} / {duration} \u0434\u043d. ({traffic_str})"

        builder.row(
            InlineKeyboardButton(
                text=label,
                callback_data=f"plan:{plan['id']}",
            )
        )
    builder.row(back_button())
    return builder.as_markup()


def locations_keyboard(
    servers: list[dict[str, Any]],
    protocol: str,
) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    seen: set[str] = set()
    for srv in servers:
        country = srv.get("country", "XX")
        if country in seen:
            continue
        seen.add(country)
        flag = srv.get("flag", "") or _country_flag(country)
        city = srv.get("city", "")
        label = f"{flag} {city or country}".strip()
        builder.row(
            InlineKeyboardButton(
                text=label,
                callback_data=f"loc:{protocol}:{country}",
            )
        )
    builder.row(back_button())
    return builder.as_markup()


def server_details_keyboard(
    servers: list[dict[str, Any]],
) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for srv in servers:
        flag = srv.get("flag", "") or _country_flag(srv.get("country", ""))
        name = srv.get("name", "Server")
        status = srv.get("status", "unknown")
        icon = "\U0001f7e2" if status == "online" else "\U0001f534"
        label = f"{icon} {flag} {name}"
        builder.row(
            InlineKeyboardButton(
                text=label,
                callback_data=f"srv:{srv.get('id', '')}",
            )
        )
    builder.row(back_button())
    return builder.as_markup()


def config_actions_keyboard(
    sub_token: str,
    sub_domain: str,
) -> InlineKeyboardMarkup:
    """Buttons shown after config is generated: sub-link, deep links."""
    sub_url = f"https://{sub_domain}/sub/{sub_token}"
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(
            text="\U0001f517 \u0421\u0441\u044b\u043b\u043a\u0430 \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0438",
            url=sub_url,
        ),
    )
    builder.row(
        InlineKeyboardButton(
            text="\U0001f4f1 v2rayNG",
            url=f"v2rayng://install-sub?url={sub_url}",
        ),
        InlineKeyboardButton(
            text="\U0001f4f1 Hiddify",
            url=f"hiddify://import/{sub_url}",
        ),
    )
    builder.row(back_button())
    return builder.as_markup()


# ── Helpers ───────────────────────────────────────────────────────

def _country_flag(code: str) -> str:
    """Convert a 2-letter country code to a flag emoji."""
    if len(code) != 2:
        return "\U0001f30d"
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in code.upper())
