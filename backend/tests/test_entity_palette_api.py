from fastapi.testclient import TestClient

from app.main import create_app


def _register(client: TestClient, **overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna-paleta@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    response = client.post("/registre", json=data)
    assert response.status_code == 201
    return response.json()


def _coordinator(client: TestClient, created: dict[str, object]) -> dict[str, object]:
    headers = {"Authorization": f"Bearer {created['token']}"}
    invited = client.post("/invitacions", headers=headers, json={"email": "carla-paleta@example.com"})
    token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    accepted = client.post(
        f"/invitacions/{token}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    assert accepted.status_code == 201
    return accepted.json()


def test_register_and_login_default_to_mar_cel(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    assert created["palette"] == "mar-cel"
    login = client.post("/sessio", json={"email": "anna-paleta@example.com", "password": "secret123"})
    assert login.status_code == 200
    assert login.json()["palette"] == "mar-cel"


def test_responsible_saves_palette_and_session_returns_it(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers = {"Authorization": f"Bearer {created['token']}"}
    patched = client.patch("/entitat/paleta", headers=headers, json={"palette": "vinyes"})
    assert patched.status_code == 200
    assert patched.json()["palette"] == "vinyes"
    sessio = client.get("/sessio", headers=headers)
    assert sessio.status_code == 200
    assert sessio.json()["palette"] == "vinyes"


def test_coordinator_cannot_save_palette(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    coord = _coordinator(client, created)
    response = client.patch(
        "/entitat/paleta",
        headers={"Authorization": f"Bearer {coord['token']}"},
        json={"palette": "camps"},
    )
    assert response.status_code == 403
    sessio = client.get("/sessio", headers={"Authorization": f"Bearer {created['token']}"})
    assert sessio.json()["palette"] == "mar-cel"


def test_invalid_palette_returns_400(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    response = client.patch(
        "/entitat/paleta",
        headers={"Authorization": f"Bearer {created['token']}"},
        json={"palette": "neon"},
    )
    assert response.status_code == 400


def test_tenant_a_palette_does_not_paint_b(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    a = _register(client)
    b = _register(
        client,
        entity_name="AAVV Barri B",
        email="berta-paleta@example.com",
        responsible_name="Berta",
    )
    client.patch(
        "/entitat/paleta",
        headers={"Authorization": f"Bearer {a['token']}"},
        json={"palette": "citrics"},
    )
    sessio_a = client.get("/sessio", headers={"Authorization": f"Bearer {a['token']}"})
    sessio_b = client.get("/sessio", headers={"Authorization": f"Bearer {b['token']}"})
    assert sessio_a.json()["palette"] == "citrics"
    assert sessio_b.json()["palette"] == "mar-cel"


def test_coordinator_reads_entity_palette_from_session(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    client.patch(
        "/entitat/paleta",
        headers={"Authorization": f"Bearer {created['token']}"},
        json={"palette": "camps"},
    )
    coord = _coordinator(client, created)
    sessio = client.get("/sessio", headers={"Authorization": f"Bearer {coord['token']}"})
    assert sessio.status_code == 200
    assert sessio.json()["palette"] == "camps"
