from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_chat_requires_auth(client: TestClient) -> None:
    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code in (401, 403)


def test_chat_echoes(authed_client: TestClient) -> None:
    resp = authed_client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hello world"}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["conversation_id"]
    assert body["message"]["role"] == "assistant"
    assert body["message"]["content"] == "You said: hello world"


def test_chat_preserves_conversation_id(authed_client: TestClient) -> None:
    resp = authed_client.post(
        "/api/chat",
        json={
            "conversation_id": "abc123",
            "messages": [{"role": "user", "content": "again"}],
        },
    )
    assert resp.status_code == 200
    assert resp.json()["conversation_id"] == "abc123"
