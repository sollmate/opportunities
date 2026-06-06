from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi_azure_auth.user import User

from app.core.config import settings
from app.core.security import azure_scheme
from app.services.agent import AgentService, EchoAgentService

# Single instance of the agent. Swap EchoAgentService for the real
# implementation here when it is ready — this is the only line that changes.
_agent_service: AgentService = EchoAgentService()


def get_agent_service() -> AgentService:
    return _agent_service


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
