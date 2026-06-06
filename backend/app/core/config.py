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

    # PostgreSQL connection. Authentication is password-less: a short-lived
    # Microsoft Entra token (acquired via the app's managed identity in Azure,
    # or your `az login` locally) is used as the password — so there is NO
    # password setting here by design.
    #
    # `pg_user` is the database role name and is environment-specific: in Azure
    # it is the managed identity's name (e.g. `ca-opportunities-agent-api`);
    # locally it is your Entra admin login (e.g. `you@sollmate.eu`).
    # Leaving pg_host/pg_database/pg_user empty disables the DB layer entirely
    # so the app still boots (e.g. a local checkout without DB access).
    pg_host: str = ""
    pg_port: int = 5432
    pg_database: str = ""
    pg_user: str = ""
    pg_pool_max_size: int = 10
    pg_command_timeout: float = 30.0

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
