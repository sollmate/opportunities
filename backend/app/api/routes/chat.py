from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_agent_service, get_current_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.agent import AgentService, new_conversation_id

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    _user: Annotated[str, Depends(get_current_user)],
    agent: Annotated[AgentService, Depends(get_agent_service)],
) -> ChatResponse:
    conversation_id = request.conversation_id or new_conversation_id()
    message = await agent.generate_reply(request.messages, conversation_id)
    return ChatResponse(conversation_id=conversation_id, message=message)
