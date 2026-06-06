from fastapi.testclient import TestClient


def test_threads_requires_auth(client: TestClient) -> None:
    resp = client.get("/api/threads")
    assert resp.status_code in (401, 403)


def test_threads_returns_list(authed_client: TestClient) -> None:
    resp = authed_client.get("/api/threads")
    assert resp.status_code == 200
    threads = resp.json()["threads"]
    assert isinstance(threads, list)
    assert threads
    first = threads[0]
    assert {"id", "title", "status", "updatedAt"} <= first.keys()
    assert first["status"] in ("idle", "in_progress", "awaiting_input", "draft")
