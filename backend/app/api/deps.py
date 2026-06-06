from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import verify_token
from app.services.agent import AgentService, EchoAgentService

_bearer = HTTPBearer(auto_error=True)

# Single instance of the agent. Swap EchoAgentService for the real
# implementation here when it is ready — this is the only line that changes.
_agent_service: AgentService = EchoAgentService()


def get_agent_service() -> AgentService:
    return _agent_service


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> str:
    """Validate the bearer token and return the (stub) user identity.

    Replace with real user resolution once authentication is implemented.
    """
    if not verify_token(credentials.credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return "dev-user"
