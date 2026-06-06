from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, health
from app.core.config import settings
from app.core.security import azure_scheme


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the Entra OpenID/JWKS cache so the first authenticated request isn't
    # slowed by config discovery.
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
