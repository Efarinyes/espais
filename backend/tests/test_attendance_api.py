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
        "email": "anna-assist@example.com",
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


def _space_and_reservation(
    client: TestClient,
    headers_resp: dict[str, str],
    headers_coord: dict[str, str],
    capacity: int = 40,
) -> dict[str, object]:
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": capacity})
    assert space.status_code == 201
    start, end = _slot_iso()
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    return posted.json()


def _invite_coordinator(client: TestClient, headers: dict[str, str], email: str) -> dict[str, object]:
    invited = client.post("/invitacions", headers=headers, json={"email": email})
    token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    accepted = client.post(
        f"/invitacions/{token}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    assert accepted.status_code == 201
    return accepted.json()


def test_coordinator_records_attendance_and_responsible_sees_it(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-assist@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": 40})
    start, end = _slot_iso()
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    assert posted.json()["attendance_count"] is None

    recorded = client.put(
        f"/reserves/{posted.json()['id']}/assistencia",
        headers=headers_coord,
        json={"count": 12},
    )
    assert recorded.status_code == 200
    assert recorded.json()["attendance_count"] == 12
    assert recorded.json()["exceeds_capacity"] is False

    listed = client.get("/reserves", headers=headers_resp, params={"des": start, "fins": end})
    assert listed.status_code == 200
    assert listed.json()[0]["attendance_count"] == 12
    assert listed.json()[0]["mine"] is False


def test_other_coordinator_cannot_record_attendance(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-assist-403@example.com")
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    autor = _invite_coordinator(client, headers_resp, "carla-autora@example.com")
    aliena = _invite_coordinator(client, headers_resp, "carla-aliena@example.com")
    headers_autor = {"Authorization": f"Bearer {autor['token']}"}
    headers_aliena = {"Authorization": f"Bearer {aliena['token']}"}
    reservation = _space_and_reservation(client, headers_resp, headers_autor)
    response = client.put(
        f"/reserves/{reservation['id']}/assistencia",
        headers=headers_aliena,
        json={"count": 3},
    )
    assert response.status_code == 403


def test_count_above_capacity_returns_warning(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-assist-cap@example.com")
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-assist-cap@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    reservation = _space_and_reservation(client, headers_resp, headers_coord, capacity=10)
    response = client.put(
        f"/reserves/{reservation['id']}/assistencia",
        headers=headers_coord,
        json={"count": 11},
    )
    assert response.status_code == 200
    assert response.json()["attendance_count"] == 11
    assert response.json()["exceeds_capacity"] is True


def test_attendance_requires_session(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    assert client.put("/reserves/00000000-0000-0000-0000-000000000001/assistencia", json={"count": 1}).status_code == 401


def test_other_entity_does_not_find_reservation(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    a = _register(client, email="a-assist@example.com", entity_name="Entitat A")
    b = _register(client, email="b-assist@example.com", entity_name="Entitat B", responsible_name="Berta")
    headers_a = {"Authorization": f"Bearer {a['token']}"}
    headers_b = {"Authorization": f"Bearer {b['token']}"}
    coord = _invite_coordinator(client, headers_a, "carla-a-assist@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    reservation = _space_and_reservation(client, headers_a, headers_coord)
    response = client.put(
        f"/reserves/{reservation['id']}/assistencia",
        headers=headers_b,
        json={"count": 2},
    )
    assert response.status_code == 404
