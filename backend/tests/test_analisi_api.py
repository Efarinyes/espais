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
        "email": "anna-analisi@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    response = client.post("/registre", json=data)
    assert response.status_code == 201
    return response.json()


def _invite_coordinator(client: TestClient, headers: dict[str, str], email: str) -> dict[str, object]:
    invited = client.post("/invitacions", headers=headers, json={"email": email})
    token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    accepted = client.post(
        f"/invitacions/{token}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    assert accepted.status_code == 201
    return accepted.json()


def _slot_iso(hour: int = 10, duration_minutes: int = 60) -> tuple[str, str]:
    start = datetime(2026, 9, 8, hour, 0, tzinfo=MADRID)
    end = start + timedelta(minutes=duration_minutes)
    return start.isoformat(), end.isoformat()


def _period() -> tuple[str, str]:
    start = datetime(2026, 9, 8, 0, 0, tzinfo=MADRID)
    end = datetime(2026, 9, 9, 0, 0, tzinfo=MADRID)
    return start.isoformat(), end.isoformat()


def test_responsible_reads_usage_of_own_entity(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-analisi@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": 40})
    start, end = _slot_iso()
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    des, fins = _period()
    summary = client.get("/analisi", headers=headers_resp, params={"des": des, "fins": fins})
    assert summary.status_code == 200
    body = summary.json()
    assert body["confirmed_count"] == 1
    assert body["cancelled_count"] == 0
    assert body["reserved_hours"] == 1.0
    assert body["available_hours"] == 14.0
    assert body["occupancy_ratio"] == 1 / 14
    assert body["average_attendance"] is None
    assert body["unregistered_count"] == 1
    assert len(body["spaces"]) == 1
    assert body["spaces"][0]["space_name"] == "Sala 1"


def test_coordinator_cannot_read_analysis(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-analisi-403@example.com")
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-analisi-403@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    des, fins = _period()
    response = client.get("/analisi", headers=headers_coord, params={"des": des, "fins": fins})
    assert response.status_code == 403


def test_other_entity_does_not_see_usage(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    a = _register(client, email="a-analisi@example.com", entity_name="Entitat A")
    b = _register(client, email="b-analisi@example.com", entity_name="Entitat B", responsible_name="Berta")
    headers_a = {"Authorization": f"Bearer {a['token']}"}
    headers_b = {"Authorization": f"Bearer {b['token']}"}
    coord = _invite_coordinator(client, headers_a, "carla-a-analisi@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    space = client.post("/espais", headers=headers_a, json={"name": "Sala 1", "capacity": 10})
    start, end = _slot_iso()
    assert (
        client.post(
            "/reserves",
            headers=headers_coord,
            json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
        ).status_code
        == 201
    )
    client.post("/espais", headers=headers_b, json={"name": "Sala B", "capacity": 20})
    des, fins = _period()
    summary_b = client.get("/analisi", headers=headers_b, params={"des": des, "fins": fins})
    assert summary_b.status_code == 200
    body = summary_b.json()
    assert body["confirmed_count"] == 0
    assert body["reserved_hours"] == 0.0
    assert body["spaces"][0]["space_name"] == "Sala B"


def test_analysis_requires_session(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    des, fins = _period()
    assert client.get("/analisi", params={"des": des, "fins": fins}).status_code == 401
