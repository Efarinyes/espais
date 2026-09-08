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
        "email": "anna-reserva@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    response = client.post("/registre", json=data)
    assert response.status_code == 201
    return response.json()


def _slot_iso(hour: int, duration_minutes: int = 60) -> tuple[str, str]:
    start = datetime(2026, 9, 8, hour, 0, tzinfo=MADRID)
    end = start + timedelta(minutes=duration_minutes)
    return start.isoformat(), end.isoformat()


def test_create_and_list_reservation(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers = {"Authorization": f"Bearer {created['token']}"}
    space = client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 40})
    assert space.status_code == 201
    start, end = _slot_iso(10)
    posted = client.post(
        "/reserves",
        headers=headers,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    assert posted.json()["space_name"] == "Sala 1"
    assert posted.json()["status"] == "confirmed"
    assert posted.json()["mine"] is True
    assert posted.json()["coordinator_name"] == "Anna"

    listed = client.get("/reserves", headers=headers, params={"des": start, "fins": end})
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["coordinator_name"] == "Anna"


def test_overlap_returns_409(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-solapa@example.com")
    headers = {"Authorization": f"Bearer {created['token']}"}
    space = client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 10})
    start, end = _slot_iso(10)
    assert client.post(
        "/reserves",
        headers=headers,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    ).status_code == 201
    overlap_start, overlap_end = _slot_iso(10, duration_minutes=30)
    response = client.post(
        "/reserves",
        headers=headers,
        json={"space_id": space.json()["id"], "starts_at": overlap_start, "ends_at": overlap_end},
    )
    assert response.status_code == 409


def test_list_requires_session(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    start, end = _slot_iso(10)
    assert client.get("/reserves", params={"des": start, "fins": end}).status_code == 401


def test_other_entity_does_not_see_reservations(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    a = _register(client, email="a-res@example.com", entity_name="Entitat A")
    b = _register(client, email="b-res@example.com", entity_name="Entitat B", responsible_name="Berta")
    headers_a = {"Authorization": f"Bearer {a['token']}"}
    headers_b = {"Authorization": f"Bearer {b['token']}"}
    space = client.post("/espais", headers=headers_a, json={"name": "Sala 1", "capacity": 10})
    start, end = _slot_iso(10)
    assert client.post(
        "/reserves",
        headers=headers_a,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    ).status_code == 201
    listed_b = client.get("/reserves", headers=headers_b, params={"des": start, "fins": end})
    assert listed_b.status_code == 200
    assert listed_b.json() == []
