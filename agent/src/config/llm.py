"""Build the Anthropic Claude model instance for the deep agent."""
from __future__ import annotations

import os

from src.config.settings import get_settings


def get_model_string() -> str:
    """Return the provider:model string for create_deep_agent.

    Also exports ANTHROPIC_API_KEY into the process environment so that
    langchain's `init_chat_model` (used internally by deepagents) can pick
    it up — it does not consult our Settings object directly.
    """
    settings = get_settings()
    if settings.anthropic_api_key and not os.environ.get("ANTHROPIC_API_KEY"):
        os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key
    return f"anthropic:{settings.anthropic_model}"
