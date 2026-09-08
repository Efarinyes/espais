from fastapi.testclient import TestClient

from app.main import create_app


def _payload(**overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    return data


def test_login_returns_same_entity_as_register(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = client.post("/registre", json=_payload()).json()
    response = client.post(
        "/sessio",
        json={"email": "Anna@example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["entity_id"] == created["entity_id"]
    assert body["token"]
    assert body["entity_name"] == "AAVV Barri A"


def test_login_wrong_password_returns_401(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    client.post("/registre", json=_payload())
    response = client.post(
        "/sessio",
        json={"email": "anna@example.com", "password": "no-es-aquesta"},
    )
    assert response.status_code == 401


def test_get_sessio_returns_only_the_callers_entity(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    a = client.post("/registre", json=_payload()).json()
    b = client.post(
        "/registre",
        json=_payload(entity_name="AAVV Barri B", email="berta@example.com", responsible_name="Berta"),
    ).json()

    sessio_a = client.get("/sessio", headers={"Authorization": f"Bearer {a['token']}"})
    sessio_b = client.get("/sessio", headers={"Authorization": f"Bearer {b['token']}"})
    assert sessio_a.status_code == 200
    assert sessio_b.status_code == 200
    assert sessio_a.json()["entity_id"] == a["entity_id"]
    assert sessio_b.json()["entity_id"] == b["entity_id"]
    assert sessio_a.json()["entity_name"] == "AAVV Barri A"
    assert sessio_b.json()["entity_name"] == "AAVV Barri B"
    assert sessio_a.json()["entity_id"] != sessio_b.json()["entity_id"]


def test_get_sessio_without_token_returns_401(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    assert client.get("/sessio").status_code == 401
