from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi_azure_auth.user import User

from app.core.config import settings
from app.core.security import azure_scheme
from app.services.agent import AgentClient, AgentService

# Single client for the agent service, pointed at the configured base URL.
_agent_service: AgentService = AgentClient(settings.agent_base_url)


def get_agent_service() -> AgentService:
    return _agent_service


def get_access_token(request: Request) -> str:
    """Extract the raw Entra bearer token from the incoming Authorization header.

    The token has already been validated by `azure_scheme` (via
    `get_current_user`); this only pulls the value back out so the backend can
    forward it to the agent service, which shares the same app registration and
    validates the token independently. Returns "" if absent.
    """
    auth = request.headers.get("Authorization", "")
    return auth[7:] if auth[:7].lower() == "bearer " else ""


def get_current_user(
    user: Annotated[User, Depends(azure_scheme)],
) -> str:
    """Resolve the authenticated user from a validated Entra ID access token.

    The token signature, issuer, audience and tenant are already verified by
    `azure_scheme`. Here we additionally require the user to hold the configured
    app role; otherwise they are a tenant member without access to this app.
    Returns a stable user identity (the Entra object id).
    """
    if settings.azure_required_role not in (user.roles or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not authorized for this application",
        )
    return user.claims.get("oid") or user.preferred_username or "unknown"
