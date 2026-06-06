import io

from fastapi.testclient import TestClient


def test_threads_requires_auth(client: TestClient) -> None:
    resp = client.get("/api/threads")
    assert resp.status_code in (401, 403)


def test_create_and_list_thread(chat_client: TestClient) -> None:
    # Create a thread by uploading a (fake) DATEV file.
    resp = chat_client.post(
        "/api/threads",
        files={"datev_file": ("ledger.csv", io.BytesIO(b"col1;col2\n"), "text/csv")},
    )
    assert resp.status_code == 200
    thread = resp.json()
    assert thread["title"] == "ledger.csv"
    thread_id = thread["id"]

    # It now shows up in the list.
    resp = chat_client.get("/api/threads")
    assert resp.status_code == 200
    threads = resp.json()["threads"]
    assert any(t["id"] == thread_id for t in threads)


def test_thread_messages_empty_for_new_thread(chat_client: TestClient) -> None:
    resp = chat_client.post(
        "/api/threads",
        files={"datev_file": ("ledger.csv", io.BytesIO(b"x"), "text/csv")},
    )
    thread_id = resp.json()["id"]

    resp = chat_client.get(f"/api/threads/{thread_id}/messages")
    assert resp.status_code == 200
    assert resp.json() == {"messages": []}


def test_thread_messages_unknown_thread(chat_client: TestClient) -> None:
    resp = chat_client.get("/api/threads/does-not-exist/messages")
    assert resp.status_code == 404
