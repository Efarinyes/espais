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


def test_post_registre_returns_201_and_ids(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    response = client.post("/registre", json=_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["entity_id"]
    assert body["user_id"]
    assert body["membership_id"]


def test_post_registre_duplicate_email_returns_409(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    assert client.post("/registre", json=_payload()).status_code == 201
    response = client.post(
        "/registre",
        json=_payload(entity_name="AAVV Barri B", email="Anna@example.com"),
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "aquest email ja està registrat"


def test_post_registre_short_password_returns_400(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    response = client.post("/registre", json=_payload(password="short"))
    assert response.status_code == 400
