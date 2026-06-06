from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, health
from app.core.config import settings
from app.core.security import azure_scheme


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the Entra OpenID/JWKS cache so the first authenticated request isn't
    # slowed by config discovery. Skip when Entra isn't configured yet (e.g. a
    # local checkout without `.env`) — otherwise discovery hits an invalid URL
    # and the whole API, including /api/health, fails to start. Authenticated
    # requests still surface a clear error if the config is genuinely missing.
    if settings.azure_tenant_id and settings.azure_client_id:
        await azure_scheme.openid_config.load_config()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="opportunities-backend", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = APIRouter(prefix="/api")
    api.include_router(health.router)
    api.include_router(chat.router)
    app.include_router(api)

    return app


app = create_app()
