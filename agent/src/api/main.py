"""FastAPI application factory."""
import os

from fastapi import FastAPI

from src.api.routes import session
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

app = FastAPI(
    title="Tax-Advisory Deep Agent (ADR-006 PoC)",
    description="DATEV-in → confidence-tagged advisory triggers. Decision-support only (StBerG).",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)
app.include_router(session.router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok"}
