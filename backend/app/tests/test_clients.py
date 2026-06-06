from fastapi.testclient import TestClient


def _new_client_payload(**overrides) -> dict:
    payload = {
        "client_type": "company",
        "display_name": "Müller GmbH",
        "status": "active",
        "contacts": [{"first_name": "Anna", "last_name": "Müller", "is_primary": True}],
        "addresses": [{"address_type": "registered", "city": "Berlin"}],
    }
    payload.update(overrides)
    return payload


def test_clients_requires_auth(client: TestClient) -> None:
    assert client.get("/api/clients").status_code in (401, 403)


def test_industries_requires_auth(client: TestClient) -> None:
    assert client.get("/api/reference/industries").status_code in (401, 403)


def test_create_and_list_client(clients_client: TestClient) -> None:
    resp = clients_client.post("/api/clients", json=_new_client_payload())
    assert resp.status_code == 201
    created = resp.json()
    assert created["display_name"] == "Müller GmbH"
    assert len(created["contacts"]) == 1
    assert created["contacts"][0]["contact_id"]
    client_id = created["client_id"]

    listed = clients_client.get("/api/clients").json()["clients"]
    assert any(c["client_id"] == client_id for c in listed)


def test_update_client(clients_client: TestClient) -> None:
    client_id = clients_client.post("/api/clients", json=_new_client_payload()).json()["client_id"]

    resp = clients_client.put(
        f"/api/clients/{client_id}",
        json=_new_client_payload(display_name="Müller AG", contacts=[]),
    )
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Müller AG"
    assert resp.json()["contacts"] == []


def test_update_unknown_client_404(clients_client: TestClient) -> None:
    resp = clients_client.put("/api/clients/does-not-exist", json=_new_client_payload())
    assert resp.status_code == 404


def test_delete_client(clients_client: TestClient) -> None:
    client_id = clients_client.post("/api/clients", json=_new_client_payload()).json()["client_id"]

    assert clients_client.delete(f"/api/clients/{client_id}").status_code == 204
    assert clients_client.delete(f"/api/clients/{client_id}").status_code == 404


def test_list_industries(clients_client: TestClient) -> None:
    resp = clients_client.get("/api/reference/industries")
    assert resp.status_code == 200
    assert resp.json()["industries"][0]["name"] == "Information technology"
