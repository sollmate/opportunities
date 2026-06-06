"""Application settings loaded from environment / .env file."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-8"
    project_root: str = "./workspace"
    langsmith_tracing: bool = False
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_api_key: str = ""
    langsmith_project: str = "tax-advisory-agent"

    # Allowed CORS origins for browser callers (comma-separated in env).
    # Only relevant when the frontend calls this API directly from the browser;
    # backend-to-agent server-to-server calls don't need CORS.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    # Postgres (optional; if empty, the fetch_master_data tool returns an error)
    database_url: str = ""

    # Microsoft Entra ID (Azure AD). The directory (tenant) id and the
    # application (client) id of the single app registration that serves both
    # the web client and this API. Incoming access tokens are validated against
    # these (issuer, audience, tid). Leave empty in local dev to disable the
    # auth gate (e.g. when running scripts or tests without Entra configured).
    azure_tenant_id: str = ""
    azure_client_id: str = ""

    # App role a user must hold (in the access token `roles` claim) to call
    # this API. Mirrors the backend's enforcement.
    azure_required_role: str = "opportunities.access"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


def ensure_workspace() -> Path:
    """Create workspace directory if it doesn't exist."""
    p = Path(get_settings().project_root)
    p.mkdir(parents=True, exist_ok=True)
    return p
