# opportunities

Our opportunities agent turns the tax advisor's data into foresight. By continuously reading a client's accounting data, the agent transforms routine bookkeeping into a living stream of advisory opportunities—shifting the profession from reactive compliance to proactive guidance, and making every client interaction timely, strategic, and valuable.

---

## Repository layout

This is a monorepo with two services:

```
backend/    FastAPI service exposing the chat REST API
frontend/   Next.js (App Router) chat interface
```

The agent's reasoning logic is developed separately. This repo provides the
**scaffolding** around it: the chat API surface, an `AgentService` seam where the
real agent is dropped in, auth stubs, and the web chat UI.

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload
# API on http://localhost:8000  (docs at /docs)
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# App on http://localhost:3000
```

Log in with any email/password (auth is a stub), then chat. The default
`EchoAgentService` replies by echoing your message — replace it with the real
agent (see `backend/app/services/agent.py`).

## The agent seam

`backend/app/services/agent.py` defines the `AgentService` protocol and a stub
`EchoAgentService`. To plug in the real agent, implement `AgentService` and return
it from `get_agent_service()` in `backend/app/api/deps.py`. Nothing else needs to
change — the transport, schemas, auth, and UI stay the same.
