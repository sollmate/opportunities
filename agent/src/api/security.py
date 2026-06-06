"""Microsoft Entra ID (Azure AD) bearer token validation for the agent API.

Mirrors `backend/app/core/security.py` so the same access token issued to the
web client by Entra (audience `api://<client-id>/access_as_user`) is accepted
by both services. The single app registration is configured in the repo README
under "Authentication".
"""
from __future__ import annotations

from fastapi_azure_auth import SingleTenantAzureAuthorizationCodeBearer

from src.config.settings import get_settings

_settings = get_settings()

# Handles OpenID config discovery, JWKS fetching/caching, and signature, issuer,
# audience and tenant (tid) validation. The exposed API scope must match the
# one configured under "Expose an API" on the app registration.
azure_scheme = SingleTenantAzureAuthorizationCodeBearer(
    app_client_id=_settings.azure_client_id,
    tenant_id=_settings.azure_tenant_id,
    scopes={
        f"api://{_settings.azure_client_id}/access_as_user": "access_as_user",
    },
)
