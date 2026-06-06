"""Thread endpoints: create (optionally uploading a DATEV export), list, and history.

A thread maps 1:1 to an agent session. The DATEV export is optional — a thread
can be opened for plain Q&A and files can still be attached to the agent
session later. The backend proxies the (optional) upload to the agent service
to open the session, persists the thread and all messages in Postgres scoped
to the signed-in user.
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
    datev_file: Annotated[
        UploadFile | None, File(description="Optional DATEV EXTF CSV or Excel")
    ] = None,
    master_data_file: Annotated[
        UploadFile | None, File(description="Optional master-data JSON")
    ] = None,
) -> Thread:
    datev_bytes = await datev_file.read() if datev_file else None
    master_bytes = await master_data_file.read() if master_data_file else None
    try:
        session_id = await agent.create_session(
            datev_filename=datev_file.filename if datev_file else None,
            datev_bytes=datev_bytes,
            master_filename=master_data_file.filename if master_data_file else None,
            master_bytes=master_bytes,
            access_token=access_token,
        )
    except AgentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    title = (datev_file.filename if datev_file else None) or "New chat"
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
