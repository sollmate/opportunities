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

| Method | Path              | Auth   | Description                          |
| ------ | ----------------- | ------ | ------------------------------------ |
| GET    | `/api/health`     | no     | Liveness check                       |
| POST   | `/api/auth/login` | no     | Stub login → returns a bearer token  |
| POST   | `/api/chat`       | bearer | Send messages, get an agent reply    |

## Plugging in the real agent

`app/services/agent.py` defines the `AgentService` protocol and a stub
`EchoAgentService`. Implement `AgentService` with the real agent and return it
from `get_agent_service()` in `app/api/deps.py`. No other changes are required.
