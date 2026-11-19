"""Escenari HTTP compartit pels tests d’avisos i de push: responsable, dos coordinadors i un espai."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from tests.alta_http import alta_i_sessio

MADRID = ZoneInfo("Europe/Madrid")


def franja(hour: int = 10, day: int = 8) -> tuple[str, str]:
    start = datetime(2026, 9, day, hour, 0, tzinfo=MADRID)
    return start.isoformat(), (start + timedelta(minutes=60)).isoformat()


def headers(token: object) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def invita_coordinador(client: TestClient, responsable: dict[str, str], email: str, name: str) -> dict[str, str]:
    invited = client.post("/invitacions", headers=responsable, json={"email": email})
    token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    accepted = client.post(
        f"/invitacions/{token}/acceptar", json={"name": name, "password": "secret123"}
    )
    assert accepted.status_code == 201, accepted.text
    return headers(accepted.json()["token"])


@dataclass
class Escenari:
    client: TestClient
    responsable: dict[str, str]
    carla: dict[str, str]
    oriol: dict[str, str]
    space_id: str

    def reserva(self, hour: int = 10, who: dict[str, str] | None = None) -> str:
        start, end = franja(hour)
        posted = self.client.post(
            "/reserves",
            headers=who or self.carla,
            json={"space_id": self.space_id, "starts_at": start, "ends_at": end},
        )
        assert posted.status_code == 201, posted.text
        return posted.json()["id"]

    def reprograma(self, reservation_id: str, hour: int, who: dict[str, str] | None = None, reason: str | None = None):  # type: ignore[no-untyped-def]
        start, end = franja(hour)
        body: dict[str, object] = {"starts_at": start, "ends_at": end}
        if reason:
            body["reason"] = reason
        return self.client.post(
            f"/reserves/{reservation_id}/reprogramacio", headers=who or self.responsable, json=body
        )

    def anula(self, reservation_id: str, who: dict[str, str] | None = None):  # type: ignore[no-untyped-def]
        return self.client.post(f"/reserves/{reservation_id}/anulacio", headers=who or self.responsable)

    def avisos(self, who: dict[str, str] | None = None) -> list[dict[str, object]]:
        response = self.client.get("/avisos", headers=who or self.carla)
        assert response.status_code == 200, response.text
        return response.json()

    def llista(self, who: dict[str, str] | None = None) -> list[dict[str, object]]:
        response = self.client.get(
            "/reserves",
            headers=who or self.responsable,
            params={"des": "2026-09-01T00:00:00+02:00", "fins": "2026-09-30T00:00:00+02:00"},
        )
        assert response.status_code == 200, response.text
        return response.json()


def crea_escenari(client: TestClient, tag: str = "a", entity_name: str = "AAVV Barri A") -> Escenari:
    created = alta_i_sessio(
        client, entity_name=entity_name, email=f"anna-{tag}@example.com"
    )
    responsable = headers(created["token"])
    carla = invita_coordinador(client, responsable, f"carla-{tag}@example.com", "Carla")
    oriol = invita_coordinador(client, responsable, f"oriol-{tag}@example.com", "Oriol")
    space = client.post("/espais", headers=responsable, json={"name": "Sala 1", "capacity": 40})
    assert space.status_code == 201, space.text
    return Escenari(client, responsable, carla, oriol, space.json()["id"])
