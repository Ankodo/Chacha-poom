"""ProxyForge Telegram Bot — entry point."""

from __future__ import annotations

import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BotCommand

from src.api import api
from src.config import settings
from src.handlers import configs, help, purchase, servers, start, subscription
from src.middlewares import LoggingMiddleware, ThrottlingMiddleware

logger = logging.getLogger(__name__)

# ── Bot commands shown in Telegram menu ───────────────────────────

BOT_COMMANDS = [
    BotCommand(command="start", description="\u0413\u043b\u0430\u0432\u043d\u043e\u0435 \u043c\u0435\u043d\u044e"),
    BotCommand(command="status", description="\u041c\u043e\u044f \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0430"),
    BotCommand(command="config", description="\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043a\u043e\u043d\u0444\u0438\u0433"),
    BotCommand(command="buy", description="\u041a\u0443\u043f\u0438\u0442\u044c \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0443"),
    BotCommand(command="servers", description="\u0421\u043f\u0438\u0441\u043e\u043a \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u0432"),
    BotCommand(command="help", description="\u041f\u043e\u043c\u043e\u0449\u044c"),
]


async def on_startup(bot: Bot) -> None:
    """Called when the bot starts polling."""
    await bot.set_my_commands(BOT_COMMANDS)
    me = await bot.get_me()
    logger.info("Bot started: @%s (id=%s)", me.username, me.id)


async def on_shutdown(bot: Bot) -> None:
    """Called when the bot stops."""
    await api.close()
    logger.info("Bot stopped, API session closed.")


async def main() -> None:
    """Initialize and start the bot."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        stream=sys.stdout,
    )
    # Silence noisy libraries
    logging.getLogger("aiohttp").setLevel(logging.WARNING)
    logging.getLogger("aiogram").setLevel(logging.INFO)

    if not settings.BOT_TOKEN:
        logger.error("BOT_TOKEN is not set. Exiting.")
        sys.exit(1)

    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    dp = Dispatcher()

    # Register middlewares on the message and callback_query routers
    dp.message.middleware(ThrottlingMiddleware())
    dp.message.middleware(LoggingMiddleware())
    dp.callback_query.middleware(LoggingMiddleware())

    # Register handler routers
    dp.include_router(start.router)
    dp.include_router(subscription.router)
    dp.include_router(configs.router)
    dp.include_router(purchase.router)
    dp.include_router(servers.router)
    dp.include_router(help.router)

    # Lifecycle hooks
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    logger.info("Starting polling...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
