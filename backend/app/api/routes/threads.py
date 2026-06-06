"""Thread endpoints: create (by uploading a DATEV export), list, and history.

A thread is created by uploading a DATEV export, which the backend proxies to
the agent service to open a session. The thread (with its agent session id) and
all messages are persisted in Postgres, scoped to the signed-in user.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import get_access_token, get_agent_service, get_current_user
from app.schemas.chat import MessagesResponse
from app.schemas.thread import Thread, ThreadListResponse
from app.services import threads_store
from app.services.agent import AgentError, AgentService

router = APIRouter(prefix="/threads", tags=["threads"])


@router.post("", response_model=Thread)
async def create_thread(
    user_id: Annotated[str, Depends(get_current_user)],
    agent: Annotated[AgentService, Depends(get_agent_service)],
    access_token: Annotated[str, Depends(get_access_token)],
    datev_file: Annotated[UploadFile, File(description="DATEV EXTF CSV or Excel")],
    master_data_file: Annotated[
        UploadFile | None, File(description="Optional master-data JSON")
    ] = None,
) -> Thread:
    datev_bytes = await datev_file.read()
    master_bytes = await master_data_file.read() if master_data_file else None
    try:
        session_id = await agent.create_session(
            datev_filename=datev_file.filename or "upload.csv",
            datev_bytes=datev_bytes,
            master_filename=master_data_file.filename if master_data_file else None,
            master_bytes=master_bytes,
            access_token=access_token,
        )
    except AgentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    title = datev_file.filename or "New chat"
    return await threads_store.create_thread(user_id, session_id, title)


@router.get("", response_model=ThreadListResponse)
async def list_threads(
    user_id: Annotated[str, Depends(get_current_user)],
) -> ThreadListResponse:
    return ThreadListResponse(threads=await threads_store.list_threads(user_id))


@router.get("/{thread_id}/messages", response_model=MessagesResponse)
async def thread_messages(
    thread_id: str,
    user_id: Annotated[str, Depends(get_current_user)],
) -> MessagesResponse:
    thread = await threads_store.get_thread(user_id, thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown thread")
    return MessagesResponse(messages=await threads_store.list_messages(thread_id))
