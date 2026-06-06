# Tax-Advisory Deep Agent (ADR-006 PoC)

Standalone FastAPI service that ingests DATEV exports and runs a LangChain Deep Agent
to surface statutory and AI-derived tax-advisory triggers for a human Steuerberater.

## Setup

```bash
uv sync
cp .env.example .env  # fill in ANTHROPIC_API_KEY
```

## Run

```bash
uv run python app.py
```

## Test

```bash
uv run pytest
```
