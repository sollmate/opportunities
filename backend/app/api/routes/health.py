from fastapi import APIRouter, Response, status

from app.core import db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    """Liveness: the process is up. Never touches dependencies."""
    return {"status": "ok"}


@router.get("/ready")
async def ready(response: Response) -> dict[str, str]:
    """Readiness: report database connectivity.

    - DB not configured -> ok (the app intentionally runs without it for now).
    - DB configured and reachable -> ok.
    - DB configured but unreachable -> 503 so orchestrators don't route traffic.
    """
    if not db.is_configured():
        return {"status": "ok", "database": "unconfigured"}
    try:
        healthy = await db.healthcheck()
    except Exception:
        healthy = False
    if healthy:
        return {"status": "ok", "database": "up"}
    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "unavailable", "database": "down"}
