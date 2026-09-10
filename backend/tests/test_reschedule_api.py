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
        "email": "anna-reprog@example.com",
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


def test_responsible_reschedules_and_coordinator_reads_aviso(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-reprog@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": 40})
    start, end = _slot_iso(10)
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    reservation_id = posted.json()["id"]
    new_start, new_end = _slot_iso(12)

    moved = client.post(
        f"/reserves/{reservation_id}/reprogramacio",
        headers=headers_resp,
        json={"starts_at": new_start, "ends_at": new_end, "reason": "canvi d’hora"},
    )
    assert moved.status_code == 200
    assert moved.json()["status"] == "confirmed"

    listed = client.get("/reserves", headers=headers_resp, params={"des": new_start, "fins": new_end})
    assert listed.status_code == 200
    assert listed.json()[0]["id"] == reservation_id

    avisos = client.get("/avisos", headers=headers_coord)
    assert avisos.status_code == 200
    assert avisos.json()[0]["type"] == "reservation_rescheduled"
    assert avisos.json()[0]["new_starts_at"]
    assert avisos.json()[0]["reason"] == "canvi d’hora"


def test_coordinator_reschedules_own_without_aviso(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-reprog-own@example.com")
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-reprog-own@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": 40})
    start, end = _slot_iso()
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    new_start, new_end = _slot_iso(12)
    response = client.post(
        f"/reserves/{posted.json()['id']}/reprogramacio",
        headers=headers_coord,
        json={"starts_at": new_start, "ends_at": new_end},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"
    avisos = client.get("/avisos", headers=headers_coord)
    assert avisos.status_code == 200
    assert avisos.json() == []


def test_coordinator_cannot_reschedule_others_via_api(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-reprog-403@example.com")
    headers_resp = {"Authorization": f"Bearer {created['token']}"}
    coord = _invite_coordinator(client, headers_resp, "carla-reprog-403@example.com")
    other = _invite_coordinator(client, headers_resp, "oriol-reprog-403@example.com")
    headers_coord = {"Authorization": f"Bearer {coord['token']}"}
    headers_other = {"Authorization": f"Bearer {other['token']}"}
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": 40})
    start, end = _slot_iso()
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    new_start, new_end = _slot_iso(12)
    response = client.post(
        f"/reserves/{posted.json()['id']}/reprogramacio",
        headers=headers_other,
        json={"starts_at": new_start, "ends_at": new_end},
    )
    assert response.status_code == 403
