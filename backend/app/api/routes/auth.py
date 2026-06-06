from fastapi import APIRouter

from app.core.security import issue_token
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(_: LoginRequest) -> TokenResponse:
    """Stub login: accepts any credentials and returns a bearer token.

    Replace with real authentication (credential check, token signing).
    """
    return TokenResponse(access_token=issue_token())
