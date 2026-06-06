from fastapi_azure_auth import SingleTenantAzureAuthorizationCodeBearer

from app.core.config import settings

# Validates Microsoft Entra ID (Azure AD) access tokens issued for this single
# tenant. Handles OpenID config discovery, JWKS fetching/caching, and signature,
# issuer, audience and tenant (tid) validation. The exposed API scope must match
# the one configured under "Expose an API" on the app registration.
azure_scheme = SingleTenantAzureAuthorizationCodeBearer(
    app_client_id=settings.azure_client_id,
    tenant_id=settings.azure_tenant_id,
    scopes={
        f"api://{settings.azure_client_id}/access_as_user": "access_as_user",
    },
)
