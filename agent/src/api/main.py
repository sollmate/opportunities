"""FastAPI application factory."""
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.deps import get_current_user
from src.api.routes import session
from src.api.security import azure_scheme
from src.config.settings import get_settings


def _export_env() -> None:
    """Push settings into os.environ so langchain / langsmith pick them up."""
    s = get_settings()
    if s.anthropic_api_key:
        os.environ.setdefault("ANTHROPIC_API_KEY", s.anthropic_api_key)
    if s.langsmith_tracing:
        os.environ.setdefault("LANGSMITH_TRACING", "true")
        # Back-compat env name expected by older langchain versions
        os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    if s.langsmith_api_key:
        os.environ.setdefault("LANGSMITH_API_KEY", s.langsmith_api_key)
        os.environ.setdefault("LANGCHAIN_API_KEY", s.langsmith_api_key)
    if s.langsmith_endpoint:
        os.environ.setdefault("LANGSMITH_ENDPOINT", s.langsmith_endpoint)
        os.environ.setdefault("LANGCHAIN_ENDPOINT", s.langsmith_endpoint)
    if s.langsmith_project:
        os.environ.setdefault("LANGSMITH_PROJECT", s.langsmith_project)
        os.environ.setdefault("LANGCHAIN_PROJECT", s.langsmith_project)


_export_env()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Warm the Entra OpenID/JWKS cache so the first authenticated request
    # isn't slowed by discovery. Skip when Entra isn't configured (e.g. local
    # scripts without `.env`) — otherwise discovery hits an invalid URL and
    # the whole API fails to start. Real requests still surface a clear error
    # when config is genuinely missing.
    s = get_settings()
    if s.azure_tenant_id and s.azure_client_id:
        await azure_scheme.openid_config.load_config()
    yield


app = FastAPI(
    title="Tax-Advisory Deep Agent",
    description="DATEV-in → confidence-tagged advisory triggers. Decision-support only (StBerG).",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Every /tax-advisory/* route requires a valid Entra access token whose owner
# holds the configured app role. /health stays public for liveness probes.
app.include_router(session.router, dependencies=[Depends(get_current_user)])


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok"}
