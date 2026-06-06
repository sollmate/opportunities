"""Build the single Tax-Advisory Deep Agent."""
from __future__ import annotations

import shutil
from pathlib import Path

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend

from src.agent.prompts import SUPERVISOR_PROMPT
from src.agent.tools.code_sandbox import make_ledger_compute
from src.agent.tools.master_data_db import make_fetch_master_data
from src.config.llm import get_model_string
from src.config.profiles import register_tax_profiles

register_tax_profiles()

_SKILLS_SRC = Path(__file__).resolve().parent.parent / "skills"
_SKILLS_VIRTUAL_DIR = ".skills"


def _stage_skills(root_dir: str) -> str:
    """Mirror src/skills/ into <root_dir>/.skills/ so FilesystemBackend can load them."""
    dest = Path(root_dir) / _SKILLS_VIRTUAL_DIR
    if _SKILLS_SRC.is_dir():
        shutil.copytree(_SKILLS_SRC, dest, dirs_exist_ok=True)
    return f"/{_SKILLS_VIRTUAL_DIR}/"


def build_agent(root_dir: str = "."):
    skills_virtual_path = _stage_skills(root_dir)
    backend = FilesystemBackend(root_dir=root_dir, virtual_mode=True)

    return create_deep_agent(
        model=get_model_string(),
        tools=[make_ledger_compute(root_dir), make_fetch_master_data(root_dir)],
        system_prompt=SUPERVISOR_PROMPT,
        skills=[skills_virtual_path],
        backend=backend,
    )
