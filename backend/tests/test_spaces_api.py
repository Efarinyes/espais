from fastapi.testclient import TestClient

from app.main import create_app


def _register(client: TestClient, **overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna-espai@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    response = client.post("/registre", json=data)
    assert response.status_code == 201
    return response.json()


def test_create_and_list_space_for_own_entity(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers = {"Authorization": f"Bearer {created['token']}"}
    response = client.post(
        "/espais",
        headers=headers,
        json={"name": "Sala 1", "capacity": 40, "equipment": "cadires"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Sala 1"
    assert body["capacity"] == 40
    assert body["entity_id"] == created["entity_id"]

    listed = client.get("/espais", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["name"] == "Sala 1"


def test_duplicate_name_same_entity_returns_409(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers = {"Authorization": f"Bearer {created['token']}"}
    assert client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 10}).status_code == 201
    response = client.post("/espais", headers=headers, json={"name": "sala 1", "capacity": 12})
    assert response.status_code == 409


def test_same_name_in_two_entities_and_no_leak(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    a = _register(client, email="a-espai@example.com", entity_name="Entitat A")
    b = _register(client, email="b-espai@example.com", entity_name="Entitat B", responsible_name="Berta")
    headers_a = {"Authorization": f"Bearer {a['token']}"}
    headers_b = {"Authorization": f"Bearer {b['token']}"}
    assert client.post("/espais", headers=headers_a, json={"name": "Sala 1", "capacity": 10}).status_code == 201
    assert client.post("/espais", headers=headers_b, json={"name": "Sala 1", "capacity": 80}).status_code == 201

    list_a = client.get("/espais", headers=headers_a).json()
    list_b = client.get("/espais", headers=headers_b).json()
    assert len(list_a) == 1
    assert len(list_b) == 1
    assert list_a[0]["capacity"] == 10
    assert list_b[0]["capacity"] == 80
    assert list_a[0]["entity_id"] == a["entity_id"]
    assert list_b[0]["entity_id"] == b["entity_id"]


def test_list_espais_requires_session(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    assert client.get("/espais").status_code == 401


def test_update_and_get_space_for_own_entity(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-edita@example.com")
    headers = {"Authorization": f"Bearer {created['token']}"}
    posted = client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 10, "equipment": "cadires"})
    space_id = posted.json()["id"]
    response = client.patch(
        f"/espais/{space_id}",
        headers=headers,
        json={"name": "Sala Pau Casals", "capacity": 40, "equipment": "piano", "active": True},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Sala Pau Casals"
    assert response.json()["capacity"] == 40
    assert response.json()["equipment"] == "piano"

    fetched = client.get(f"/espais/{space_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Sala Pau Casals"


def test_deactivate_space_remains_in_list(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-baixa@example.com")
    headers = {"Authorization": f"Bearer {created['token']}"}
    posted = client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 10})
    space_id = posted.json()["id"]
    response = client.patch(
        f"/espais/{space_id}",
        headers=headers,
        json={"name": "Sala 1", "capacity": 10, "equipment": None, "active": False},
    )
    assert response.status_code == 200
    assert response.json()["active"] is False
    listed = client.get("/espais", headers=headers).json()
    assert len(listed) == 1
    assert listed[0]["id"] == space_id
    assert listed[0]["active"] is False


def test_cannot_update_space_of_other_entity(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    a = _register(client, email="a-edita@example.com", entity_name="Entitat A")
    b = _register(client, email="b-edita@example.com", entity_name="Entitat B", responsible_name="Berta")
    headers_a = {"Authorization": f"Bearer {a['token']}"}
    headers_b = {"Authorization": f"Bearer {b['token']}"}
    posted = client.post("/espais", headers=headers_b, json={"name": "Sala 1", "capacity": 10})
    space_id = posted.json()["id"]
    response = client.patch(
        f"/espais/{space_id}",
        headers=headers_a,
        json={"name": "Piratejada", "capacity": 99, "active": True},
    )
    assert response.status_code == 404
    assert client.get(f"/espais/{space_id}", headers=headers_a).status_code == 404
    assert client.get(f"/espais/{space_id}", headers=headers_b).json()["name"] == "Sala 1"
