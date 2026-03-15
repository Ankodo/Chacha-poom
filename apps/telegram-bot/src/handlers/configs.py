"""/config command and 'Get Config' button handler."""

from __future__ import annotations

import io
import logging

import qrcode
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    Message,
)

from src.api import api, APIError
from src.config import settings
from src.handlers.start import ensure_token
from src.keyboards import (
    back_menu_keyboard,
    config_actions_keyboard,
    locations_keyboard,
    protocols_keyboard,
)

router = Router()
logger = logging.getLogger(__name__)

# Protocol mapping: callback_data suffix -> display + filter values
PROTOCOL_MAP = {
    "vless_reality": {
        "name": "VLESS Reality",
        "protocol": "vless",
        "security": "reality",
    },
    "vless_cdn": {
        "name": "VLESS CDN",
        "protocol": "vless",
        "security": "tls",
        "connection_mode": "cdn",
    },
    "trojan_cdn": {
        "name": "Trojan CDN",
        "protocol": "trojan",
        "security": "tls",
        "connection_mode": "cdn",
    },
    "hysteria2": {
        "name": "Hysteria2",
        "protocol": "hysteria2",
    },
}


def _generate_qr(data: str) -> BufferedInputFile:
    """Generate a QR-code PNG image from a string."""
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return BufferedInputFile(buf.read(), filename="config_qr.png")


def _filter_configs(
    configs: list[dict],
    protocol_key: str,
    country: str | None = None,
) -> list[dict]:
    """Filter configs by protocol type and optionally by country."""
    spec = PROTOCOL_MAP.get(protocol_key, {})
    result = []
    for cfg in configs:
        if spec.get("protocol") and cfg.get("protocol") != spec["protocol"]:
            continue
        if spec.get("security") and cfg.get("security") != spec["security"]:
            continue
        if spec.get("connection_mode") and cfg.get("connection_mode") != spec["connection_mode"]:
            continue
        if country and cfg.get("country", cfg.get("node_country", "")) != country:
            continue
        result.append(cfg)
    return result


# ── /config command ───────────────────────────────────────────────

@router.message(Command("config"))
async def cmd_config(message: Message) -> None:
    await message.answer(
        "\u2699\ufe0f <b>\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b:</b>",
        reply_markup=protocols_keyboard(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "configs")
async def cb_configs(callback: CallbackQuery) -> None:
    await callback.answer()
    if callback.message:
        await callback.message.edit_text(
            "\u2699\ufe0f <b>\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b:</b>",
            reply_markup=protocols_keyboard(),
            parse_mode="HTML",
        )


# ── Protocol selected -> show locations ───────────────────────────

@router.callback_query(F.data.startswith("proto:"))
async def cb_protocol_selected(callback: CallbackQuery) -> None:
    await callback.answer()
    protocol_key = callback.data.split(":", 1)[1]  # type: ignore[union-attr]
    spec = PROTOCOL_MAP.get(protocol_key)
    if not spec:
        return

    # Fetch servers to show locations
    try:
        servers = await api.get_servers()
    except APIError:
        servers = []

    if not servers:
        if callback.message:
            await callback.message.edit_text(
                "\u274c \u0421\u0435\u0440\u0432\u0435\u0440\u044b \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.",
                reply_markup=back_menu_keyboard(),
                parse_mode="HTML",
            )
        return

    if callback.message:
        await callback.message.edit_text(
            f"\U0001f30d <b>\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043b\u043e\u043a\u0430\u0446\u0438\u044e \u0434\u043b\u044f {spec['name']}:</b>",
            reply_markup=locations_keyboard(servers, protocol_key),
            parse_mode="HTML",
        )


# ── Location selected -> generate and send config ─────────────────

@router.callback_query(F.data.startswith("loc:"))
async def cb_location_selected(callback: CallbackQuery) -> None:
    await callback.answer("\u23f3 \u0413\u0435\u043d\u0435\u0440\u0438\u0440\u0443\u044e \u043a\u043e\u043d\u0444\u0438\u0433...")
    user = callback.from_user
    if not user or not callback.message:
        return

    parts = callback.data.split(":", 2)  # type: ignore[union-attr]
    if len(parts) < 3:
        return
    protocol_key = parts[1]
    country = parts[2]

    token = await ensure_token(user.id, user.username)
    if not token:
        await callback.message.edit_text(
            "\u274c \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f. \u041d\u0430\u0436\u043c\u0438\u0442\u0435 /start",
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
        return

    try:
        all_configs = await api.get_configs(token)
    except APIError as e:
        logger.error("get_configs failed: %s", e)
        await callback.message.edit_text(
            "\u274c \u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435 \u043a\u043e\u043d\u0444\u0438\u0433\u043e\u0432. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.",
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
        return

    configs = _filter_configs(all_configs, protocol_key, country)
    if not configs:
        await callback.message.edit_text(
            "\u274c \u041a\u043e\u043d\u0444\u0438\u0433\u0438 \u0434\u043b\u044f \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0439 \u043a\u043e\u043c\u0431\u0438\u043d\u0430\u0446\u0438\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.\n"
            "\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043e\u0439 \u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b \u0438\u043b\u0438 \u043b\u043e\u043a\u0430\u0446\u0438\u044e.",
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
        return

    # Take the first matching config
    cfg = configs[0]
    uri = cfg.get("uri", "")
    remark = cfg.get("remark", cfg.get("node_name", "config"))
    spec = PROTOCOL_MAP.get(protocol_key, {})

    # Fetch profile to get sub_token
    try:
        profile = await api.get_profile(token)
        sub_token = profile.get("sub_token", "")
    except APIError:
        sub_token = ""

    # Send text config
    text = (
        f"\u2705 <b>\u041a\u043e\u043d\u0444\u0438\u0433 {spec.get('name', protocol_key)}</b>\n"
        f"\U0001f4cd {remark}\n\n"
        f"<b>URI:</b>\n<code>{uri}</code>"
    )

    # Delete the previous message (protocol/location selection)
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Send the config text
    await callback.message.answer(
        text,
        reply_markup=config_actions_keyboard(sub_token, settings.SUB_DOMAIN) if sub_token else back_menu_keyboard(),
        parse_mode="HTML",
    )

    # Send QR code as a photo
    if uri:
        try:
            qr_file = _generate_qr(uri)
            await callback.message.answer_photo(
                qr_file,
                caption="\U0001f4f7 QR-\u043a\u043e\u0434 \u0434\u043b\u044f \u0438\u043c\u043f\u043e\u0440\u0442\u0430 \u0432 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435",
            )
        except Exception as e:
            logger.error("QR generation failed: %s", e)

    # If there are more configs, mention it
    if len(configs) > 1:
        await callback.message.answer(
            f"\U0001f4dd \u041d\u0430\u0439\u0434\u0435\u043d\u043e \u043a\u043e\u043d\u0444\u0438\u0433\u043e\u0432: {len(configs)}. "
            "\u041f\u043e\u043a\u0430\u0437\u0430\u043d \u043f\u0435\u0440\u0432\u044b\u0439. \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u0441\u0441\u044b\u043b\u043a\u0443 \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0438 \u0434\u043b\u044f \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u044f \u0432\u0441\u0435\u0445.",
            parse_mode="HTML",
        )
