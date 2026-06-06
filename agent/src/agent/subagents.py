"""Tax-analyst subagent definition."""
from src.agent.prompts import SUBAGENT_PROMPT
from src.agent.tools.code_sandbox import ledger_compute

TAX_ANALYST_SUBAGENT = {
    "name": "tax-analyst",
    "description": (
        "Deep multi-step tax analysis: multi-signal synthesis and judgment-dependent "
        "optimization over the ledger. Use for anything requiring several computations "
        "or complex reasoning across multiple statutory areas."
    ),
    "system_prompt": SUBAGENT_PROMPT,
    "tools": [ledger_compute],
    # model omitted → inherits the supervisor's Anthropic Claude model
}
