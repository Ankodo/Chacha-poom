"""/buy command and payment flow handler."""

from __future__ import annotations

import logging

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message, InlineKeyboardButton, InlineKeyboardMarkup

from src.api import api, APIError
from src.handlers.start import ensure_token
from src.keyboards import (
    back_menu_keyboard,
    payment_methods_keyboard,
    plans_keyboard,
)

router = Router()
logger = logging.getLogger(__name__)


# ── /buy command ──────────────────────────────────────────────────

@router.message(Command("buy"))
async def cmd_buy(message: Message) -> None:
    await _show_plans(message)


@router.callback_query(F.data == "buy")
async def cb_buy(callback: CallbackQuery) -> None:
    await callback.answer()
    if callback.message:
        await _show_plans_edit(callback)


async def _show_plans(message: Message) -> None:
    try:
        plans = await api.get_plans()
    except APIError as e:
        logger.error("get_plans failed: %s", e)
        await message.answer(
            "\u274c \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0442\u0430\u0440\u0438\u0444\u044b. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.",
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
        return

    if not plans:
        await message.answer(
            "\U0001f6ab \u0422\u0430\u0440\u0438\u0444\u044b \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b.",
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
        return

    await message.answer(
        "\U0001f4b3 <b>\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0430\u0440\u0438\u0444:</b>",
        reply_markup=plans_keyboard(plans),
        parse_mode="HTML",
    )


async def _show_plans_edit(callback: CallbackQuery) -> None:
    try:
        plans = await api.get_plans()
    except APIError as e:
        logger.error("get_plans failed: %s", e)
        if callback.message:
            await callback.message.edit_text(
                "\u274c \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0442\u0430\u0440\u0438\u0444\u044b.",
                reply_markup=back_menu_keyboard(),
                parse_mode="HTML",
            )
        return

    if not plans:
        if callback.message:
            await callback.message.edit_text(
                "\U0001f6ab \u0422\u0430\u0440\u0438\u0444\u044b \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b.",
                reply_markup=back_menu_keyboard(),
                parse_mode="HTML",
            )
        return

    if callback.message:
        await callback.message.edit_text(
            "\U0001f4b3 <b>\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0430\u0440\u0438\u0444:</b>",
            reply_markup=plans_keyboard(plans),
            parse_mode="HTML",
        )


# ── Plan selected -> show payment methods ─────────────────────────

@router.callback_query(F.data.startswith("plan:"))
async def cb_plan_selected(callback: CallbackQuery) -> None:
    await callback.answer()
    plan_id = callback.data.split(":", 1)[1]  # type: ignore[union-attr]

    # Try to find the plan name for a better message
    try:
        plans = await api.get_plans()
        plan = next((p for p in plans if str(p.get("id")) == plan_id), None)
    except APIError:
        plan = None

    plan_name = plan.get("name", "\u0422\u0430\u0440\u0438\u0444") if plan else "\u0422\u0430\u0440\u0438\u0444"
    price_str = ""
    if plan:
        price_str = f"\n\U0001f4b0 \u0426\u0435\u043d\u0430: {plan.get('price', 0):.0f} {plan.get('currency', 'RUB')}"

    if callback.message:
        await callback.message.edit_text(
            f"\U0001f4b3 <b>{plan_name}</b>{price_str}\n\n"
            "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043f\u043e\u0441\u043e\u0431 \u043e\u043f\u043b\u0430\u0442\u044b:",
            reply_markup=payment_methods_keyboard(plan_id),
            parse_mode="HTML",
        )


# ── Payment method selected -> create payment ─────────────────────

@router.callback_query(F.data.startswith("pay:"))
async def cb_payment_method(callback: CallbackQuery) -> None:
    await callback.answer("\u23f3 \u0421\u043e\u0437\u0434\u0430\u044e \u043f\u043b\u0430\u0442\u0451\u0436...")
    user = callback.from_user
    if not user or not callback.message:
        return

    parts = callback.data.split(":", 2)  # type: ignore[union-attr]
    if len(parts) < 3:
        return
    plan_id = parts[1]
    provider = parts[2]

    token = await ensure_token(user.id, user.username)
    if not token:
        await callback.message.edit_text(
            "\u274c \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f. \u041d\u0430\u0436\u043c\u0438\u0442\u0435 /start",
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
        return

    try:
        result = await api.create_payment(token, plan_id, provider)
    except APIError as e:
        logger.error("create_payment failed: %s", e)
        await callback.message.edit_text(
            "\u274c \u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0438 \u043f\u043b\u0430\u0442\u0435\u0436\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.",
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
        return

    payment_url = result.get("payment_url", "")
    payment_id = result.get("payment_id", "")

    provider_names = {
        "yookassa": "YooKassa",
        "cryptobot": "CryptoBot",
        "manual": "\u0420\u0443\u0447\u043d\u0430\u044f \u043e\u043f\u043b\u0430\u0442\u0430",
    }
    provider_name = provider_names.get(provider, provider)

    if provider == "manual":
        # Manual payment: show instructions
        text = (
            f"\U0001f4dd <b>{provider_name}</b>\n\n"
            f"\u041d\u043e\u043c\u0435\u0440 \u043f\u043b\u0430\u0442\u0435\u0436\u0430: <code>{payment_id}</code>\n\n"
            "\U0001f4b0 \u041f\u0435\u0440\u0435\u0432\u0435\u0434\u0438\u0442\u0435 \u043e\u043f\u043b\u0430\u0442\u0443 \u043f\u043e \u0440\u0435\u043a\u0432\u0438\u0437\u0438\u0442\u0430\u043c \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 "
            "\u0441\u043a\u0440\u0438\u043d\u0448\u043e\u0442 \u0447\u0435\u043a\u0430 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0443.\n\n"
            "\u041f\u043e\u0434\u043f\u0438\u0441\u043a\u0430 \u0431\u0443\u0434\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u0430 \u043f\u043e\u0441\u043b\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f."
        )
        await callback.message.edit_text(
            text,
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
    elif payment_url:
        # Online payment: send link
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text=f"\U0001f4b3 \u041e\u043f\u043b\u0430\u0442\u0438\u0442\u044c \u0447\u0435\u0440\u0435\u0437 {provider_name}",
                url=payment_url,
            )],
            [InlineKeyboardButton(
                text="\u2705 \u042f \u043e\u043f\u043b\u0430\u0442\u0438\u043b",
                callback_data=f"check_pay:{payment_id}",
            )],
            [InlineKeyboardButton(
                text="\u25c0\ufe0f \u041d\u0430\u0437\u0430\u0434 \u0432 \u043c\u0435\u043d\u044e",
                callback_data="back_menu",
            )],
        ])
        await callback.message.edit_text(
            f"\U0001f517 <b>\u041e\u043f\u043b\u0430\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 {provider_name}</b>\n\n"
            "\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043a\u043d\u043e\u043f\u043a\u0443 \u043d\u0438\u0436\u0435 \u0434\u043b\u044f \u043f\u0435\u0440\u0435\u0445\u043e\u0434\u0430 \u043a \u043e\u043f\u043b\u0430\u0442\u0435.\n"
            "\u041f\u043e\u0441\u043b\u0435 \u043e\u043f\u043b\u0430\u0442\u044b \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \"\u042f \u043e\u043f\u043b\u0430\u0442\u0438\u043b\" \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438.",
            reply_markup=kb,
            parse_mode="HTML",
        )
    else:
        await callback.message.edit_text(
            "\u274c \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u043b\u0430\u0442\u0451\u0436. \u041e\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044c \u0432 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0443.",
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )


# ── Payment check ─────────────────────────────────────────────────

@router.callback_query(F.data.startswith("check_pay:"))
async def cb_check_payment(callback: CallbackQuery) -> None:
    """User clicks 'I paid' — notify them to wait for confirmation."""
    await callback.answer()
    payment_id = callback.data.split(":", 1)[1]  # type: ignore[union-attr]

    if callback.message:
        await callback.message.edit_text(
            "\u23f3 <b>\u041f\u043b\u0430\u0442\u0451\u0436 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442\u0441\u044f...</b>\n\n"
            f"\u041d\u043e\u043c\u0435\u0440: <code>{payment_id}</code>\n\n"
            "\u041f\u043e\u0434\u043f\u0438\u0441\u043a\u0430 \u0431\u0443\u0434\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u0430 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u043f\u043e\u0441\u043b\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f.\n"
            "\u0415\u0441\u043b\u0438 \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0430 \u043d\u0435 \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043b\u0430\u0441\u044c \u0432 \u0442\u0435\u0447\u0435\u043d\u0438\u0435 10 \u043c\u0438\u043d\u0443\u0442, "
            "\u043e\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044c \u0432 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0443.",
            reply_markup=back_menu_keyboard(),
            parse_mode="HTML",
        )
