from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, chat, health
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title="opportunities-backend")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = APIRouter(prefix="/api")
    api.include_router(health.router)
    api.include_router(auth.router)
    api.include_router(chat.router)
    app.include_router(api)

    return app


app = create_app()
