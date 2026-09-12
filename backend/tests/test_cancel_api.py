from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.main import create_app

MADRID = ZoneInfo("Europe/Madrid")


def _register(client: TestClient, **overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna-cancel@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    response = client.post("/registre", json=data)
    assert response.status_code == 201
    return response.json()


def _slot_iso(hour: int = 10) -> tuple[str, str]:
    start = datetime(2026, 9, 8, hour, 0, tzinfo=MADRID)
    end = start + timedelta(minutes=60)
    return start.isoformat(), end.isoformat()


def _invite_coordinator(client: TestClient, headers: dict[str, str], email: str) -> dict[str, object]:
    invited = client.post("/invitacions", headers=headers, json={"email": email})
    token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    accepted = client.post(
        f"/invitacions/{token}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    assert accepted.status_code == 201
    return accepted.json()


def test_responsible_cancels_and_coordinator_reads_aviso(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-cancel@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": 40})
    start, end = _slot_iso()
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    reservation_id = posted.json()["id"]

    cancelled = client.post(
        f"/reserves/{reservation_id}/anulacio",
        headers=headers_resp,
        json={"reason": "canvi de sala"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    listed = client.get("/reserves", headers=headers_resp, params={"des": start, "fins": end})
    assert listed.status_code == 200
    assert listed.json() == []
    with_cancelled = client.get(
        "/reserves",
        headers=headers_resp,
        params={"des": start, "fins": end, "inclou_anulades": True},
    )
    assert with_cancelled.status_code == 200
    assert len(with_cancelled.json()) == 1
    assert with_cancelled.json()[0]["status"] == "cancelled"

    avisos = client.get("/avisos", headers=headers_coord)
    assert avisos.status_code == 200
    assert len(avisos.json()) == 1
    assert avisos.json()[0]["type"] == "reservation_cancelled"
    assert avisos.json()[0]["space_name"] == "Sala 1"
    assert avisos.json()[0]["reason"] == "canvi de sala"
    assert avisos.json()[0]["read_at"] is None
    avis_id = avisos.json()[0]["id"]

    empty_resp = client.get("/avisos", headers=headers_resp)
    assert empty_resp.json() == []

    marked = client.post(f"/avisos/{avis_id}/llegit", headers=headers_coord)
    assert marked.status_code == 200
    assert marked.json()["read_at"] is not None

    archived = client.post(f"/avisos/{avis_id}/arxivat", headers=headers_coord)
    assert archived.status_code == 204
    assert client.get("/avisos", headers=headers_coord).json() == []


def test_coordinator_cannot_archive_unread_aviso(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-archive-unread@example.com")
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-archive-unread@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": 40})
    start, end = _slot_iso()
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    cancelled = client.post(f"/reserves/{posted.json()['id']}/anulacio", headers=headers_resp)
    assert cancelled.status_code == 200
    avis_id = client.get("/avisos", headers=headers_coord).json()[0]["id"]

    response = client.post(f"/avisos/{avis_id}/arxivat", headers=headers_coord)
    assert response.status_code == 409
    assert "ja llegits" in response.json()["detail"]
    assert len(client.get("/avisos", headers=headers_coord).json()) == 1


def test_coordinator_cannot_cancel_via_api(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-cancel-403@example.com")
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-cancel-403@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": 40})
    start, end = _slot_iso()
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    response = client.post(f"/reserves/{posted.json()['id']}/anulacio", headers=headers_coord)
    assert response.status_code == 403


def test_cancel_requires_session(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    assert client.post("/reserves/00000000-0000-0000-0000-000000000001/anulacio").status_code == 401
    assert client.get("/avisos").status_code == 401


def test_other_entity_cannot_cancel_or_read_aviso(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    a = _register(client, email="a-cancel@example.com", entity_name="Entitat A")
    b = _register(client, email="b-cancel@example.com", entity_name="Entitat B", responsible_name="Berta")
    headers_a = {"Authorization": f"Bearer {a['token']}"}
    headers_b = {"Authorization": f"Bearer {b['token']}"}
    coord = _invite_coordinator(client, headers_a, "carla-a-cancel@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    space = client.post("/espais", headers=headers_a, json={"name": "Sala 1", "capacity": 40})
    start, end = _slot_iso()
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    reservation_id = posted.json()["id"]
    assert client.post(f"/reserves/{reservation_id}/anulacio", headers=headers_b).status_code == 404

    cancelled = client.post(f"/reserves/{reservation_id}/anulacio", headers=headers_a)
    assert cancelled.status_code == 200
    avisos = client.get("/avisos", headers=headers_coord)
    assert avisos.status_code == 200
    avis_id = avisos.json()[0]["id"]
    assert client.get("/avisos", headers=headers_b).json() == []
    assert client.post(f"/avisos/{avis_id}/llegit", headers=headers_b).status_code == 404
    assert client.post(f"/avisos/{avis_id}/arxivat", headers=headers_b).status_code == 404
