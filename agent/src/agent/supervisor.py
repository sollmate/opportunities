"""Construct the supervisor Deep Agent."""
from __future__ import annotations

import shutil
from pathlib import Path

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend

from src.agent.prompts import SUPERVISOR_PROMPT
from src.agent.subagents import TAX_ANALYST_SUBAGENT
from src.agent.tools.code_sandbox import ledger_compute
from src.config.llm import get_model_string
from src.config.profiles import register_tax_profiles

# Register profiles once at import time
register_tax_profiles()

_SKILLS_SRC = Path(__file__).resolve().parent.parent / "skills"
_SKILLS_VIRTUAL_DIR = ".skills"


def _stage_skills(root_dir: str) -> str:
    """Mirror the on-disk skills tree into the sandboxed workspace so the
    FilesystemBackend (which only accepts paths inside root_dir) can load them.
    Returns the POSIX virtual path to pass as a skills source.
    """
    dest = Path(root_dir) / _SKILLS_VIRTUAL_DIR
    if _SKILLS_SRC.is_dir():
        shutil.copytree(_SKILLS_SRC, dest, dirs_exist_ok=True)
    return f"/{_SKILLS_VIRTUAL_DIR}/"


def build_agent(root_dir: str = "."):
    """Wire model + the single custom tool + subagent + on-disk skills.

    FilesystemBackend sandboxes file access to root_dir. Skills must live
    inside that root, so we stage them into <root_dir>/.skills/.
    """
    skills_virtual_path = _stage_skills(root_dir)
    backend = FilesystemBackend(root_dir=root_dir, virtual_mode=True)

    return create_deep_agent(
        model=get_model_string(),
        tools=[ledger_compute],
        system_prompt=SUPERVISOR_PROMPT,
        subagents=[TAX_ANALYST_SUBAGENT],
        skills=[skills_virtual_path],
        backend=backend,
    )
