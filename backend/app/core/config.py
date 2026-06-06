from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, loaded from environment / `.env`."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Allowed CORS origins for the browser frontend (comma-separated in env).
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    # Microsoft Entra ID (Azure AD) configuration. The directory (tenant) ID and
    # the application (client) ID of the single app registration that serves both
    # the web client and this API. Incoming access tokens are validated against
    # these (issuer, audience, tid).
    azure_tenant_id: str = ""
    azure_client_id: str = ""

    # App role a user must be assigned to access the application. Enforced
    # against the `roles` claim of the validated access token.
    azure_required_role: str = "opportunities.access"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
