"""Avisos de modificació i anul·lació (ADR 0026) de punta a punta per HTTP, amb SQLite."""

from uuid import UUID

from fastapi.testclient import TestClient

from app.adapters.sqlalchemy.models import ReservationRow
from app.main import create_app
from tests.notificacions_http import crea_escenari, franja


def _fila(factory, reservation_id: str) -> ReservationRow:  # type: ignore[no-untyped-def]
    with factory() as session:
        row = session.get(ReservationRow, UUID(reservation_id))
        assert row is not None
        return row


def _client(factory) -> TestClient:  # type: ignore[no-untyped-def]
    return TestClient(create_app(session_factory=factory))


def test_escenari_a_modificacio_avis_llegit_i_reserva_blocada(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10)

    moved = env.reprograma(reserva, 12, reason="acte municipal")
    assert moved.status_code == 200
    assert moved.json()["managed_by_responsible"] is True
    assert moved.json()["notice"]["read_at"] is None

    [avis] = env.avisos()
    assert avis["type"] == "reservation_rescheduled"
    assert avis["space_name"] == "Sala 1"
    assert avis["reservation_id"] == reserva
    assert avis["space_id"] == env.space_id
    assert avis["changes"] == ["start_time", "end_time"]
    assert avis["reason"] == "acte municipal"
    assert avis["read_at"] is None
    assert avis["starts_at"].startswith("2026-09-08T08:00")
    assert avis["new_starts_at"].startswith("2026-09-08T10:00")

    pendent = next(item for item in env.llista() if item["id"] == reserva)
    assert pendent["notice"]["notification_id"] == avis["id"]
    assert pendent["notice"]["read_at"] is None

    read = env.client.post(f"/avisos/{avis['id']}/llegit", headers=env.carla)
    assert read.status_code == 200
    assert read.json()["read_at"] is not None

    persistit = env.avisos()[0]["read_at"]
    assert persistit == read.json()["read_at"]
    vist = next(item for item in env.llista() if item["id"] == reserva)
    assert vist["notice"]["read_at"] == persistit

    nova = env.reprograma(reserva, 15, who=env.carla)
    assert nova.status_code == 403
    anul = env.anula(reserva, who=env.carla)
    assert anul.status_code == 403
    assert next(item for item in env.llista() if item["id"] == reserva)["status"] == "confirmed"


def test_el_coordinador_veu_el_bloqueig_pero_no_l_estat_de_lectura(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10)
    env.reprograma(reserva, 12)

    seva = next(item for item in env.llista(env.carla) if item["id"] == reserva)
    assert seva["managed_by_responsible"] is True
    assert seva["notice"] is None
    altre = next(item for item in env.llista(env.oriol) if item["id"] == reserva)
    assert altre["notice"] is None


def test_el_coordinador_continua_registrant_assistencia_d_una_reserva_modificada(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10)
    env.reprograma(reserva, 12)

    response = env.client.put(
        f"/reserves/{reserva}/assistencia", headers=env.carla, json={"count": 9}
    )

    assert response.status_code == 200
    assert response.json()["attendance_count"] == 9


def test_escenari_b_anul_lacio_avis_i_registre_historic(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10)

    cancelled = env.anula(reserva)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    [avis] = env.avisos()
    assert avis["type"] == "reservation_cancelled"
    assert avis["space_name"] == "Sala 1"
    assert avis["starts_at"].startswith("2026-09-08T08:00")
    assert avis["ends_at"].startswith("2026-09-08T09:00")
    assert avis["new_starts_at"] is None
    assert avis["changes"] == []

    assert all(item["id"] != reserva for item in env.llista())
    historic = _fila(sqlite_session_factory, reserva)
    assert historic.status == "cancelled"
    assert historic.coordinator_id is not None

    assert env.reprograma(reserva, 10, who=env.carla).status_code == 400
    assert env.reprograma(reserva, 14, who=env.carla).status_code == 400
    assert env.anula(reserva, who=env.carla).status_code == 409
    assert (
        env.client.put(
            f"/reserves/{reserva}/assistencia", headers=env.carla, json={"count": 4}
        ).status_code
        == 400
    )
    assert _fila(sqlite_session_factory, reserva).status == "cancelled"
    assert len(env.avisos()) == 1


def test_anul_lar_dues_vegades_no_duplica_l_avis(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10)
    env.anula(reserva)

    assert env.anula(reserva).status_code == 409
    assert len(env.avisos()) == 1


def test_escenari_c_franja_alliberada_admet_una_reserva_independent(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    original = env.reserva(10)
    env.anula(original)

    nova = env.reserva(10, who=env.oriol)

    assert nova != original
    llistat = {item["id"]: item for item in env.llista()}
    assert original not in llistat
    assert _fila(sqlite_session_factory, original).status == "cancelled"
    assert llistat[nova]["status"] == "confirmed"
    assert llistat[nova]["managed_by_responsible"] is False
    assert env.avisos(env.oriol) == []
    assert (
        env.client.put(f"/reserves/{nova}/assistencia", headers=env.oriol, json={"count": 5}).status_code
        == 200
    )
    assert env.reprograma(nova, 12, who=env.oriol).status_code == 200
    assert env.anula(nova, who=env.oriol).status_code == 200


def test_el_coordinador_que_modifica_la_seva_reserva_no_genera_avis(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10)

    assert env.reprograma(reserva, 12, who=env.carla).status_code == 200
    assert env.reprograma(reserva, 14, who=env.carla).status_code == 200
    assert env.anula(reserva, who=env.carla).status_code == 200

    assert env.avisos(env.carla) == []
    assert env.client.get("/avisos/enviats", headers=env.responsable).json() == []


def test_una_reprogramacio_sense_canvi_no_crea_avis_ni_bloqueja(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10)

    assert env.reprograma(reserva, 10).status_code == 200

    assert env.avisos() == []
    assert env.reprograma(reserva, 12, who=env.carla).status_code == 200


def test_cada_coordinador_nomes_veu_i_marca_els_seus_avisos(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10, who=env.carla)
    env.anula(reserva)
    [avis] = env.avisos(env.carla)

    assert env.avisos(env.oriol) == []
    assert env.client.post(f"/avisos/{avis['id']}/llegit", headers=env.oriol).status_code == 404
    assert env.client.post(f"/avisos/{avis['id']}/arxivat", headers=env.oriol).status_code == 404
    assert env.avisos(env.carla)[0]["read_at"] is None
    assert env.client.post(f"/avisos/{avis['id']}/llegit", headers=env.responsable).status_code == 403


def test_un_avis_d_una_altra_entitat_no_es_veu_ni_es_marca(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    client = _client(sqlite_session_factory)
    a = crea_escenari(client, "a", "AAVV Barri A")
    b = crea_escenari(client, "b", "Club B")
    reserva = a.reserva(10)
    a.anula(reserva)
    [avis] = a.avisos()

    assert b.avisos() == []
    assert client.post(f"/avisos/{avis['id']}/llegit", headers=b.carla).status_code == 404
    assert client.get("/avisos/enviats", headers=b.responsable).json() == []
    assert a.avisos()[0]["read_at"] is None


def test_el_responsable_veu_els_avisos_enviats_i_si_s_han_llegit(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    anul_lada = env.reserva(10)
    modificada = env.reserva(14)
    env.anula(anul_lada)
    env.reprograma(modificada, 16)

    enviats = env.client.get("/avisos/enviats", headers=env.responsable).json()
    assert {item["type"] for item in enviats} == {"reservation_cancelled", "reservation_rescheduled"}
    assert {item["coordinator_name"] for item in enviats} == {"Carla"}
    assert all(item["read_at"] is None for item in enviats)
    cancel = next(item for item in enviats if item["type"] == "reservation_cancelled")
    assert cancel["reservation_status"] == "cancelled"
    assert cancel["space_name"] == "Sala 1"

    env.client.post(f"/avisos/{cancel['id']}/llegit", headers=env.carla)
    despres = env.client.get("/avisos/enviats", headers=env.responsable).json()
    assert next(item for item in despres if item["id"] == cancel["id"])["read_at"] is not None
    assert next(item for item in despres if item["read_at"] is None)["type"] == "reservation_rescheduled"


def test_el_coordinador_no_pot_veure_els_avisos_enviats(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    assert env.client.get("/avisos/enviats", headers=env.carla).status_code == 403
    assert env.client.get("/avisos/enviats").status_code == 401


def test_un_avis_arxivat_continua_informant_al_responsable(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10)
    env.anula(reserva)
    [avis] = env.avisos()
    env.client.post(f"/avisos/{avis['id']}/llegit", headers=env.carla)
    env.client.post(f"/avisos/{avis['id']}/arxivat", headers=env.carla)

    assert env.avisos() == []
    [enviat] = env.client.get("/avisos/enviats", headers=env.responsable).json()
    assert enviat["read_at"] is not None


def test_les_franges_dels_avisos_son_les_de_la_reserva_original(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env = crea_escenari(_client(sqlite_session_factory))
    reserva = env.reserva(10)
    start, end = franja(10)

    env.anula(reserva)

    [avis] = env.avisos()
    assert avis["starts_at"].startswith("2026-09-08T08:00")
    assert start.startswith("2026-09-08T10:00")
    assert end.startswith("2026-09-08T11:00")
