"""Autorització HTTP: el rol surt de la membership, no del navegador."""

from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.adapters.sqlalchemy.models import MembershipRow, UserRow
from app.main import create_app
from tests.alta_http import alta_i_sessio
from tests.sessio_http import inicia_sessio

MADRID = ZoneInfo("Europe/Madrid")
ALIENA = "00000000-0000-0000-0000-000000000099"


def _register(client: TestClient, **overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna-authz@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    return alta_i_sessio(client, **data)


def _invite(client: TestClient, headers: dict[str, str], email: str, name: str = "Carla") -> dict[str, object]:
    invited = client.post("/invitacions", headers=headers, json={"email": email})
    assert invited.status_code == 201
    token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    accepted = client.post(
        f"/invitacions/{token}/acceptar",
        json={"name": name, "password": "secret123"},
    )
    assert accepted.status_code == 201
    return accepted.json()


def _auth(token: object) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _period() -> dict[str, str]:
    start = datetime(2026, 9, 8, 0, 0, tzinfo=MADRID)
    end = start + timedelta(days=1)
    return {"des": start.isoformat(), "fins": end.isoformat()}


def _slot() -> tuple[str, str]:
    start = datetime(2026, 9, 8, 10, 0, tzinfo=MADRID)
    end = start + timedelta(minutes=60)
    return start.isoformat(), end.isoformat()


def test_els_endpoints_privats_sense_sessio_responen_401(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    periode = _period()
    start, end = _slot()
    espai = {"name": "Sala", "capacity": 10}
    reserva = {"space_id": ALIENA, "starts_at": start, "ends_at": end}
    crides = [
        client.get("/espais"),
        client.get(f"/espais/{ALIENA}"),
        client.post("/espais", json=espai),
        client.patch(f"/espais/{ALIENA}", json={**espai, "active": True}),
        client.get("/reserves", params=periode),
        client.post("/reserves", json=reserva),
        client.put(f"/reserves/{ALIENA}/assistencia", json={"count": 1}),
        client.post(f"/reserves/{ALIENA}/anulacio"),
        client.post(f"/reserves/{ALIENA}/reprogramacio", json={"starts_at": start, "ends_at": end}),
        client.get("/analisi", params=periode),
        client.get("/entitat/coordinadors"),
        client.patch("/entitat/paleta", json={"palette": "mar-cel"}),
        client.post("/invitacions", json={"email": "nou@example.com"}),
        client.get("/avisos"),
        client.post(f"/avisos/{ALIENA}/llegit"),
        client.post(f"/avisos/{ALIENA}/arxivat"),
        client.get("/sessio"),
        client.post("/sessio/tancament"),
    ]
    assert [crida.status_code for crida in crides] == [401] * len(crides)
    assert client.get("/salut").status_code == 200
    assert client.get("/invitacions/token-inventat").status_code == 404


def test_el_rol_enviat_al_cos_no_concedeix_permisos(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client)
    headers = _auth(created["token"])
    coord = _invite(client, headers, "carla-cos@example.com")
    denied = client.post(
        "/espais",
        headers=_auth(coord["token"]),
        json={"name": "Sala", "capacity": 10, "role": "responsible"},
    )
    assert denied.status_code == 403


def test_el_coordinador_no_executa_les_operacions_del_responsable(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-coord-deny@example.com")
    headers = _auth(created["token"])
    space = client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 10})
    assert space.status_code == 201
    space_id = space.json()["id"]
    coord = _invite(client, headers, "carla-deny@example.com")
    seus = _auth(coord["token"])
    periode = _period()
    assert client.post("/espais", headers=seus, json={"name": "Altra", "capacity": 8}).status_code == 403
    assert client.patch(
        f"/espais/{space_id}",
        headers=seus,
        json={"name": "Sala 1", "capacity": 10, "active": True},
    ).status_code == 403
    assert client.get("/analisi", headers=seus, params=periode).status_code == 403
    assert client.get("/entitat/coordinadors", headers=seus).status_code == 403
    assert client.patch("/entitat/paleta", headers=seus, json={"palette": "camps"}).status_code == 403
    assert client.post("/invitacions", headers=seus, json={"email": "altre@example.com"}).status_code == 403
    assert client.get("/espais", headers=seus).status_code == 200
    assert client.get(f"/espais/{space_id}", headers=seus).status_code == 200


def test_el_responsable_no_executa_les_operacions_del_coordinador(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-resp-deny@example.com")
    headers = _auth(created["token"])
    space = client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 10})
    coord = _invite(client, headers, "carla-resp-deny@example.com")
    start, end = _slot()
    posted = client.post(
        "/reserves",
        headers=_auth(coord["token"]),
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    denied = client.post(
        "/reserves",
        headers=headers,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert denied.status_code == 403
    assert client.get("/avisos", headers=headers).status_code == 403
    avis_id = client.get("/avisos", headers=_auth(coord["token"])).json()
    assert avis_id == []
    assert client.post(f"/avisos/{ALIENA}/llegit", headers=headers).status_code == 403
    assert client.post(f"/avisos/{ALIENA}/arxivat", headers=headers).status_code == 403


def test_els_dos_rols_llegeixen_reserves_de_la_seva_entitat(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-share@example.com")
    headers = _auth(created["token"])
    space = client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 10})
    coord = _invite(client, headers, "carla-share@example.com")
    start, end = _slot()
    posted = client.post(
        "/reserves",
        headers=_auth(coord["token"]),
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    params = _period()
    del_responsable = client.get("/reserves", headers=headers, params=params)
    del_coordinador = client.get("/reserves", headers=_auth(coord["token"]), params=params)
    assert del_responsable.status_code == 200
    assert del_coordinador.status_code == 200
    assert len(del_responsable.json()) == 1
    assert del_responsable.json()[0]["coordinator_name"] == "Carla"
    assert del_coordinador.json()[0]["mine"] is True


def test_canviar_l_identificador_no_obre_un_recurs_d_una_altra_entitat(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    a = _register(client, email="a-authz@example.com", entity_name="Entitat A")
    b = _register(client, email="b-authz@example.com", entity_name="Entitat B", responsible_name="Berta")
    headers_a = _auth(a["token"])
    headers_b = _auth(b["token"])
    coord_a = _invite(client, headers_a, "carla-a-authz@example.com", name="Carla A")
    coord_b = _invite(client, headers_b, "carla-b-authz@example.com", name="Carla B")
    space = client.post("/espais", headers=headers_a, json={"name": "Sala A", "capacity": 10})
    space_id = space.json()["id"]
    start, end = _slot()
    posted = client.post(
        "/reserves",
        headers=_auth(coord_a["token"]),
        json={"space_id": space_id, "starts_at": start, "ends_at": end},
    )
    assert posted.status_code == 201
    reservation_id = posted.json()["id"]
    assert client.get(f"/espais/{space_id}", headers=headers_b).status_code == 404
    assert client.patch(
        f"/espais/{space_id}",
        headers=headers_b,
        json={"name": "Sala A", "capacity": 10, "active": True},
    ).status_code == 404
    assert client.post(f"/reserves/{reservation_id}/anulacio", headers=headers_b).status_code == 404
    assert client.put(
        f"/reserves/{reservation_id}/assistencia",
        headers=_auth(coord_b["token"]),
        json={"count": 3},
    ).status_code == 404
    cancelled = client.post(f"/reserves/{reservation_id}/anulacio", headers=headers_a)
    assert cancelled.status_code == 200
    avis_id = client.get("/avisos", headers=_auth(coord_a["token"])).json()[0]["id"]
    assert client.post(f"/avisos/{avis_id}/llegit", headers=_auth(coord_b["token"])).status_code == 404
    assert client.get("/reserves", headers=headers_b, params=_period()).json() == []


def test_una_sessio_revocada_o_caducada_es_rebutja(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-morta@example.com")
    headers = _auth(created["token"])
    assert client.get("/espais", headers=headers).status_code == 200
    assert client.post("/sessio/tancament", headers=headers).status_code == 204
    assert client.get("/espais", headers=headers).status_code == 401
    assert client.get("/sessio", headers=headers).status_code == 401

    reopened = inicia_sessio(client, "anna-morta@example.com", "secret123")
    assert reopened.status_code == 200
    viu = _auth(reopened.json()["token"])
    db = sqlite_session_factory()
    user = db.scalars(select(UserRow).where(UserRow.id == UUID(str(reopened.json()["user_id"])))).one()
    user.session_version += 1
    db.commit()
    db.close()
    assert client.get("/sessio", headers=viu).status_code == 401
    assert client.get("/espais", headers={"Authorization": "Bearer no-es-un-token"}).status_code == 401


def test_el_canvi_de_rol_a_la_base_s_aplica_a_la_peticio_seguent(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = _register(client, email="anna-canvi-rol@example.com")
    headers = _auth(created["token"])
    space = client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 10})
    assert space.status_code == 201
    db = sqlite_session_factory()
    membership = db.scalars(
        select(MembershipRow).where(MembershipRow.user_id == UUID(str(created["user_id"])))
    ).one()
    membership.role = "coordinator"
    db.commit()
    db.close()
    sessio = client.get("/sessio", headers=headers)
    assert sessio.status_code == 200
    assert sessio.json()["role"] == "coordinator"
    assert client.post("/espais", headers=headers, json={"name": "Sala 2", "capacity": 8}).status_code == 403
    assert client.get("/analisi", headers=headers, params=_period()).status_code == 403
    start, end = _slot()
    created_reservation = client.post(
        "/reserves",
        headers=headers,
        json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end},
    )
    assert created_reservation.status_code == 201
