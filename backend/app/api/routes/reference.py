"""Reference / lookup data endpoints (read-only) used to populate UI selects."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.client import IndustryListResponse
from app.services import masterdata_store

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/industries", response_model=IndustryListResponse)
async def list_industries(
    _user_id: Annotated[str, Depends(get_current_user)],
) -> IndustryListResponse:
    return IndustryListResponse(industries=await masterdata_store.list_industries())
