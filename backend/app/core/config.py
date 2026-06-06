from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, loaded from environment / `.env`."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Allowed CORS origins for the browser frontend (comma-separated in env).
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    # Placeholder token accepted by the auth stub. Replace with real auth.
    dev_auth_token: str = "dev-secret-token"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
