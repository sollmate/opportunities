from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_login_returns_token(client: TestClient) -> None:
    resp = client.post("/api/auth/login", json={"email": "a@b.c", "password": "x"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_chat_requires_auth(client: TestClient) -> None:
    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code in (401, 403)


def test_chat_echoes(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        json={"messages": [{"role": "user", "content": "hello world"}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["conversation_id"]
    assert body["message"]["role"] == "assistant"
    assert body["message"]["content"] == "You said: hello world"


def test_chat_preserves_conversation_id(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        json={
            "conversation_id": "abc123",
            "messages": [{"role": "user", "content": "again"}],
        },
    )
    assert resp.status_code == 200
    assert resp.json()["conversation_id"] == "abc123"
