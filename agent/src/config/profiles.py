"""Harness profile registration for the tax-advisory agent.

We register a custom profile so that our domain-specific prompts take
precedence and the Deep Agents base prompts don't interfere with
our tax-advisory system prompt. The profile uses base_system_prompt
to REPLACE the built-in base prompt entirely.
"""
from __future__ import annotations

from deepagents import (
    GeneralPurposeSubagentProfile,
    HarnessProfile,
    register_harness_profile,
)

TAX_AGENT_BASE_PROMPT = """\
You are a deep agent operating within a tax-advisory harness. You have access to
a virtual filesystem, a task-planning tool, and the ability to delegate to subagents.

Core rules for this environment:
- Use the filesystem tools (read_file, write_file, ls, glob, grep) to access
  ledger data, master data, skills, and reference files.
- Use write_todos to plan multi-step analysis before executing.
- Use the task() tool to delegate complex subtasks to specialized subagents.
- NEVER compute monetary figures in your head. Always use the ledger_compute tool.
- Read SKILL.md files for threshold values and procedures before applying checks.
"""

TAX_AGENT_SUFFIX = """\
Remember: All output is decision-support for a qualified Steuerberater.
You DO NOT file, sign, or finalize any tax matter (StBerG).
Tag every finding as 'statutory' or 'ai_derived' with confidence and legal basis.
"""

GP_SUBAGENT_PROMPT = """\
You are a meticulous German tax-analysis assistant operating as a subagent.
You receive focused tasks from the supervisor. Use ledger_compute for ALL
arithmetic. Read skills and reference data as needed. Return a compact,
evidence-backed summary with computed figures and legal basis.
Never invent numbers. Assign monetary computations to ledger_compute.
"""


def register_tax_profiles() -> None:
    """Register harness profiles for Anthropic models used by this agent."""
    profile = HarnessProfile(
        base_system_prompt=TAX_AGENT_BASE_PROMPT,
        system_prompt_suffix=TAX_AGENT_SUFFIX,
        general_purpose_subagent=GeneralPurposeSubagentProfile(
            system_prompt=GP_SUBAGENT_PROMPT,
        ),
    )
    # Register for the anthropic provider so it applies to all Claude models
    register_harness_profile("anthropic", profile)
