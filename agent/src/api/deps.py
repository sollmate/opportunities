"""Shared FastAPI dependencies for the agent API."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi_azure_auth.user import User

from src.api.security import azure_scheme
from src.config.settings import get_settings


def get_current_user(
    user: Annotated[User, Depends(azure_scheme)],
) -> str:
    """Resolve the authenticated user from a validated Entra ID access token.

    `azure_scheme` already verified the token's signature, issuer, audience and
    tenant. Here we additionally require the configured app role — without it
    a tenant member is signed in but not authorized to use this application.
    Returns a stable identity (the Entra object id) for logging/correlation.
    """
    required = get_settings().azure_required_role
    if required not in (user.roles or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not authorized for this application",
        )
    return user.claims.get("oid") or user.preferred_username or "unknown"
