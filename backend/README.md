# opportunities-backend

FastAPI service exposing the chat REST API for the opportunities agent.

## Run

```bash
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload
```

- API base: `http://localhost:8000/api`
- Interactive docs: `http://localhost:8000/docs`

## Checks

```bash
uv run ruff check .       # lint
uv run ruff format .      # format
uv run pytest             # tests
```

## Endpoints

| Method | Path          | Auth   | Description                       |
| ------ | ------------- | ------ | --------------------------------- |
| GET    | `/api/health` | no     | Liveness check                    |
| POST   | `/api/chat`   | bearer | Send messages, get an agent reply |

## Authentication

`/api/chat` requires a Microsoft Entra ID access token (`Authorization: Bearer
<token>`), obtained by the frontend via Auth.js. `app/core/security.py` validates
the token (signature/issuer/audience/tenant) via `fastapi-azure-auth`, and
`get_current_user` in `app/api/deps.py` additionally requires the
`AZURE_REQUIRED_ROLE` app role — otherwise it returns `403`. Configure
`AZURE_TENANT_ID`, `AZURE_CLIENT_ID` and `AZURE_REQUIRED_ROLE` in `.env` (see the
root README for the Azure app registration steps).

## Plugging in the real agent

`app/services/agent.py` defines the `AgentService` protocol and a stub
`EchoAgentService`. Implement `AgentService` with the real agent and return it
from `get_agent_service()` in `app/api/deps.py`. No other changes are required.
