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

Sign in with a Microsoft account from your tenant (see **Authentication** below
for the required Entra ID configuration), then chat. The default
`EchoAgentService` replies by echoing your message — replace it with the real
agent (see `backend/app/services/agent.py`).

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

`backend/app/services/agent.py` defines the `AgentService` protocol and a stub
`EchoAgentService`. To plug in the real agent, implement `AgentService` and return
it from `get_agent_service()` in `backend/app/api/deps.py`. Nothing else needs to
change — the transport, schemas, auth, and UI stay the same.
