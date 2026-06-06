"""Client master-data endpoints: list, create, update, delete.

Clients are org-wide master data shared across advisors, so these endpoints
require an authenticated, authorized user (``get_current_user``) but are NOT
scoped per user — unlike chat threads.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import get_current_user
from app.schemas.client import Client, ClientListResponse, ClientUpsert
from app.services import masterdata_store

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=ClientListResponse)
async def list_clients(
    _user_id: Annotated[str, Depends(get_current_user)],
) -> ClientListResponse:
    return ClientListResponse(clients=await masterdata_store.list_clients())


@router.post("", response_model=Client, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientUpsert,
    _user_id: Annotated[str, Depends(get_current_user)],
) -> Client:
    return await masterdata_store.create_client(payload)


@router.put("/{client_id}", response_model=Client)
async def update_client(
    client_id: str,
    payload: ClientUpsert,
    _user_id: Annotated[str, Depends(get_current_user)],
) -> Client:
    client = await masterdata_store.update_client(client_id, payload)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown client")
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    _user_id: Annotated[str, Depends(get_current_user)],
) -> Response:
    if not await masterdata_store.delete_client(client_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown client")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
