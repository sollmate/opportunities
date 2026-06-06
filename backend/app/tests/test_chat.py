import io

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_chat_requires_auth(client: TestClient) -> None:
    resp = client.post("/api/chat", json={"thread_id": "t1", "text": "hi"})
    assert resp.status_code in (401, 403)


def test_chat_unknown_thread(chat_client: TestClient) -> None:
    resp = chat_client.post("/api/chat", json={"thread_id": "nope", "text": "hi"})
    assert resp.status_code == 404


def test_chat_streams_and_persists(chat_client: TestClient) -> None:
    # Start a thread, then send a message and read the SSE stream.
    created = chat_client.post(
        "/api/threads",
        files={"datev_file": ("ledger.csv", io.BytesIO(b"x"), "text/csv")},
    )
    thread_id = created.json()["id"]

    resp = chat_client.post(
        "/api/chat",
        json={"thread_id": thread_id, "text": "hello world"},
    )
    assert resp.status_code == 200
    body = resp.text
    assert "event: token" in body
    assert "event: final" in body
    assert "Hello there" in body

    # The user message and the assistant's final reply are persisted.
    msgs = chat_client.get(f"/api/threads/{thread_id}/messages").json()["messages"]
    assert {"role": "user", "content": "hello world"} in msgs
    assert {"role": "assistant", "content": "Hello there"} in msgs
