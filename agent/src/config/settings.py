"""Application settings loaded from environment / .env file."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-8"
    project_root: str = "./workspace"
    langsmith_tracing: bool = False
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_api_key: str = ""
    langsmith_project: str = "tax-advisory-agent"

    # Postgres (optional; if empty, the fetch_master_data tool returns an error)
    database_url: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


def ensure_workspace() -> Path:
    """Create workspace directory if it doesn't exist."""
    p = Path(get_settings().project_root)
    p.mkdir(parents=True, exist_ok=True)
    return p
