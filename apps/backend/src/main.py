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

# Routers
app.include_router(auth_router, prefix="/api/admin/auth", tags=["Auth"])
app.include_router(nodes_router, prefix="/api/admin/nodes", tags=["Nodes"])
app.include_router(users_router, prefix="/api/admin/users", tags=["Users"])
app.include_router(inbounds_router, prefix="/api/admin/inbounds", tags=["Inbounds"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
