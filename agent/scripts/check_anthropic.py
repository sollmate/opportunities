"""Verify Anthropic connectivity in one shot."""
import os

from langchain_anthropic import ChatAnthropic

from src.config.settings import get_settings


if __name__ == "__main__":
    settings = get_settings()
    os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)
    model = ChatAnthropic(model=settings.anthropic_model)
    resp = model.invoke("Reply with the single word: pong")
    print("Anthropic OK:", resp.content)
