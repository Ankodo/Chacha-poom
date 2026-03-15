from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.logging import logger
from src.modules.auth.router import router as auth_router
from src.modules.nodes.router import router as nodes_router
from src.modules.users.router import router as users_router
from src.modules.inbounds.router import router as inbounds_router
from src.modules.configs.router import router as configs_router
from src.modules.plans.router import router as plans_router
from src.modules.stats.router import router as stats_router
from src.modules.sublinks.router import router as sublinks_router
from src.modules.monitoring.router import admin_router as monitoring_admin_router
from src.modules.monitoring.router import node_router as monitoring_node_router
from src.modules.payments.router import admin_router as payments_admin_router
from src.modules.payments.router import webhook_router as payments_webhook_router
from src.modules.client.router import router as client_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("ProxyForge starting", version=settings.APP_VERSION)
    yield
    logger.info("ProxyForge shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admin API Routers
app.include_router(auth_router, prefix="/api/admin/auth", tags=["Auth"])
app.include_router(nodes_router, prefix="/api/admin/nodes", tags=["Nodes"])
app.include_router(users_router, prefix="/api/admin/users", tags=["Users"])
app.include_router(inbounds_router, prefix="/api/admin/inbounds", tags=["Inbounds"])
app.include_router(configs_router, prefix="/api/admin/configs", tags=["Configs"])
app.include_router(plans_router, prefix="/api/admin/plans", tags=["Plans"])
app.include_router(stats_router, prefix="/api/admin/stats", tags=["Stats"])

# Monitoring Admin API
app.include_router(monitoring_admin_router, prefix="/api/admin/monitoring", tags=["Monitoring"])

# Node Agent API (authenticated by agent token)
app.include_router(monitoring_node_router, prefix="/api/node", tags=["Node Agent"])

# Payments Admin API
app.include_router(payments_admin_router, prefix="/api/admin/payments", tags=["Payments"])

# Payments Webhook API (public, no auth — signature verification inside)
app.include_router(payments_webhook_router, prefix="/api/payments", tags=["Payment Webhooks"])

# Client API (for Telegram bot + client site)
app.include_router(client_router, prefix="/api/client", tags=["Client"])

# Sub-link API (public, no auth)
app.include_router(sublinks_router, prefix="/sub", tags=["Sub-link"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
