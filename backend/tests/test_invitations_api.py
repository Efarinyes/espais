from fastapi.testclient import TestClient

from app.main import create_app


def _register(client: TestClient, **overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna-invite@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    response = client.post("/registre", json=data)
    assert response.status_code == 201
    return response.json()


def test_responsible_invites_and_coordinator_accepts(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers = {"Authorization": f"Bearer {created['token']}"}
    invited = client.post("/invitacions", headers=headers, json={"email": "carla@example.com"})
    assert invited.status_code == 201
    body = invited.json()
    assert body["email"] == "carla@example.com"
    assert body["accept_url"].startswith("/invitar/")
    token = body["accept_url"].rsplit("/", 1)[-1]

    preview = client.get(f"/invitacions/{token}")
    assert preview.status_code == 200
    assert preview.json()["email"] == "carla@example.com"
    assert preview.json()["entity_name"] == "AAVV Barri A"

    accepted = client.post(
        f"/invitacions/{token}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    assert accepted.status_code == 201
    assert accepted.json()["role"] == "coordinator"
    assert accepted.json()["entity_id"] == created["entity_id"]
    assert accepted.json()["user_name"] == "Carla"
    assert accepted.json()["token"]

    sessio = client.get("/sessio", headers={"Authorization": f"Bearer {accepted.json()['token']}"})
    assert sessio.status_code == 200
    assert sessio.json()["role"] == "coordinator"


def test_invite_requires_session(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    assert client.post("/invitacions", json={"email": "carla@example.com"}).status_code == 401


def test_invite_duplicate_email_returns_409(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers = {"Authorization": f"Bearer {created['token']}"}
    response = client.post("/invitacions", headers=headers, json={"email": "anna-invite@example.com"})
    assert response.status_code == 409


def test_unknown_invitation_returns_404(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    assert client.get("/invitacions/inexistent").status_code == 404


def test_coordinator_cannot_invite(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-coord-invite@example.com")
    headers = {"Authorization": f"Bearer {created['token']}"}
    invited = client.post("/invitacions", headers=headers, json={"email": "carla-coord@example.com"})
    token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    accepted = client.post(
        f"/invitacions/{token}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    coord_headers = {"Authorization": f"Bearer {accepted.json()['token']}"}
    response = client.post("/invitacions", headers=coord_headers, json={"email": "altra@example.com"})
    assert response.status_code == 403
