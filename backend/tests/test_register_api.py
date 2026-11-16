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


def test_post_registre_no_obre_sessio(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    response = client.post("/registre", json=_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["lliurament"] == "unavailable"
    assert "token" not in body
    assert "verificació" in body["detall"]
    login = client.post("/sessio", json={"email": "anna@example.com", "password": "secret123"})
    assert login.status_code == 403
    assert login.json()["detail"] == "Verifica el correu abans d’iniciar sessió."


def test_post_registre_duplicate_email_does_not_confirm_it_exists(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    assert client.post("/registre", json=_payload()).status_code == 201
    response = client.post(
        "/registre",
        json=_payload(entity_name="AAVV Barri B", email="Anna@example.com"),
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail == "No s’ha pogut completar el registre. Revisa les dades o inicia la sessió."
    assert "registrat" not in detail
    assert "existeix" not in detail


def test_post_registre_short_password_returns_400(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    response = client.post("/registre", json=_payload(password="short"))
    assert response.status_code == 400
