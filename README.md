# opportunities

Our opportunities agent turns the tax advisor's data into foresight. By continuously reading a client's accounting data, the agent transforms routine bookkeeping into a living stream of advisory opportunities—shifting the profession from reactive compliance to proactive guidance, and making every client interaction timely, strategic, and valuable.

---

## Repository layout

This is a monorepo with three services:

```
agent/      FastAPI service: DATEV-in → streamed advisory reasoning (the agent)
backend/    FastAPI service: auth + Postgres persistence + gateway to the agent
frontend/   Next.js (App Router) chat interface
```

The browser talks only to `backend/`, which enforces Microsoft Entra auth,
persists threads/messages in Postgres, and proxies to `agent/` (which has no auth
of its own). A chat starts by uploading a DATEV export; the agent's reasoning is
streamed back to the UI over Server-Sent Events.

```
frontend  ──Bearer──▶  backend  ──proxy──▶  agent
                          │
                          └──▶ Azure Postgres (chat schema)
```

## Quick start

### Agent

```bash
cd agent
cp .env.example .env        # set ANTHROPIC_API_KEY
uv sync
uv run uvicorn src.api.main:app --port 8001
# Agent on http://localhost:8001  (docs at /docs)
```

### Backend

```bash
cd backend
cp .env.example .env        # set AGENT_BASE_URL=http://localhost:8001, AZURE_*, PG_*
uv sync
uv run uvicorn app.main:app --reload
# API on http://localhost:8000  (docs at /docs)
```

The agent and backend both default to port 8000, so run the agent on a
different port (8001 above) and point `AGENT_BASE_URL` at it.

Chat persistence lives in the `chat` schema — apply `db/chat_schema.sql`
(and the `chat` grants in `db/grant_managed_identity.sql`) to the
`opportunities_poc` database before chatting.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# App on http://localhost:3000
```

Sign in with a Microsoft account from your tenant (see **Authentication** below
for the required Entra ID configuration), attach a DATEV export (CSV/Excel) in
the chat to start a thread, then chat. A sample ledger lives at
`agent/tests/fixtures/tc01_kleinunternehmer_under.csv`.

## Authentication

Sign-in uses **Microsoft Entra ID (Azure AD)**, restricted to members of a
single tenant who are assigned a specific app role. The Next.js frontend drives
the OAuth flow with Auth.js, and the FastAPI backend validates the resulting
access token and enforces the role on every protected request.

### Azure app registration (one-time)

Create a single app registration that serves both the web client and the API:

1. **App registrations → New registration** — single-tenant ("Accounts in this
   organizational directory only"). Platform **Web**, redirect URI
   `http://localhost:3000/api/auth/callback/microsoft-entra-id` (add production
   URLs later).
2. **Certificates & secrets → New client secret** (Auth.js is a confidential
   client).
3. **Expose an API** — set the Application ID URI to `api://<client-id>` and add
   a delegated scope `access_as_user`.
4. **App roles → Create** — e.g. display name "Opportunities User", value
   `opportunities.access`, allowed member types Users/Groups.
5. **API permissions** — add the app's own `api://<client-id>/access_as_user`
   delegated permission, keep `openid`/`profile`/`email`, then **Grant admin
   consent**.
6. **Enterprise applications → Properties → Assignment required = Yes**, then
   under **Users and groups** assign the app role to the allowed users/group.

Note the **Tenant ID** and **Client ID** (and client secret) and fill them into
`backend/.env` (`AZURE_*`) and `frontend/.env.local` (`AUTH_MICROSOFT_ENTRA_ID_*`).

## The agent seam

`backend/app/services/agent.py` defines the `AgentService` protocol and the
`AgentClient` that talks to the agent service over HTTP (`create_session` for the
DATEV upload, `stream_message` for the SSE reply stream). It is constructed from
`AGENT_BASE_URL` and returned by `get_agent_service()` in
`backend/app/api/deps.py`. The chat route streams whatever the agent emits and
persists the final reply; the threads route persists the thread on upload.
