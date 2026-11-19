"""Migració 0012: bloqueig retroactiu de reserves ja modificades pel responsable i taula de push."""

from pathlib import Path
from uuid import UUID

from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from alembic import command

ENTITY = UUID(int=1).hex
USER = UUID(int=2).hex
SPACE = UUID(int=3).hex
MODIFICADA = UUID(int=10).hex
ANUL_LADA = UUID(int=11).hex
NORMAL = UUID(int=12).hex
NOW = "2026-09-08 12:00:00.000000"


def _config(url: str) -> Config:
    repo_root = Path(__file__).resolve().parents[2]
    cfg = Config(str(repo_root / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def _reserva(connection, reservation_id: str, status: str, hour: int) -> None:  # type: ignore[no-untyped-def]
    connection.execute(
        text(
            "INSERT INTO reservations (id, entity_id, space_id, coordinator_id, coordinator_name, "
            "starts_at, ends_at, status, created_at) VALUES (:id, :entity, :space, :user, 'Carla', "
            ":start, :end, :status, :now)"
        ),
        {
            "id": reservation_id,
            "entity": ENTITY,
            "space": SPACE,
            "user": USER,
            "start": f"2026-09-08 {hour:02d}:00:00.000000",
            "end": f"2026-09-08 {hour + 1:02d}:00:00.000000",
            "status": status,
            "now": NOW,
        },
    )


def _avis(connection, notification_id: int, reservation_id: str, kind: str) -> None:  # type: ignore[no-untyped-def]
    connection.execute(
        text(
            "INSERT INTO notifications (id, entity_id, user_id, reservation_id, type, payload, created_at) "
            "VALUES (:id, :entity, :user, :reservation, :type, '{}', :now)"
        ),
        {
            "id": UUID(int=100 + notification_id).hex,
            "entity": ENTITY,
            "user": USER,
            "reservation": reservation_id,
            "type": kind,
            "now": NOW,
        },
    )


def test_la_migracio_blocca_les_reserves_ja_modificades_pel_responsable_i_crea_la_taula_de_push(
    tmp_path: Path,
) -> None:
    url = f"sqlite:///{tmp_path / 'espais.sqlite3'}"
    cfg = _config(url)
    command.upgrade(cfg, "0011_email_verification")
    engine = create_engine(url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text("INSERT INTO entities (id, name, palette, created_at) VALUES (:id, 'AAVV', 'mar-cel', :now)"),
                {"id": ENTITY, "now": NOW},
            )
            connection.execute(
                text(
                    "INSERT INTO users (id, name, email, password_hash, session_version, created_at) "
                    "VALUES (:id, 'Carla', 'carla@example.com', 'hash', 0, :now)"
                ),
                {"id": USER, "now": NOW},
            )
            connection.execute(
                text(
                    "INSERT INTO spaces (id, entity_id, name, name_normalized, capacity, active, created_at) "
                    "VALUES (:id, :entity, 'Sala 1', 'sala 1', 40, 1, :now)"
                ),
                {"id": SPACE, "entity": ENTITY, "now": NOW},
            )
            _reserva(connection, MODIFICADA, "rescheduled", 10)
            _reserva(connection, ANUL_LADA, "cancelled", 12)
            _reserva(connection, NORMAL, "confirmed", 14)
            _avis(connection, 1, MODIFICADA, "reservation_rescheduled")
            _avis(connection, 2, ANUL_LADA, "reservation_cancelled")

        command.upgrade(cfg, "head")

        with engine.connect() as connection:
            flags = dict(
                connection.execute(
                    text("SELECT id, managed_by_responsible FROM reservations")
                ).all()
            )
        insp = inspect(engine)
        push_columns = {column["name"] for column in insp.get_columns("push_subscriptions")}
        push_uniques = {item["name"] for item in insp.get_unique_constraints("push_subscriptions")}
    finally:
        engine.dispose()

    assert bool(flags[MODIFICADA]) is True
    assert bool(flags[ANUL_LADA]) is False
    assert bool(flags[NORMAL]) is False
    assert {"id", "entity_id", "user_id", "endpoint_hash", "endpoint", "p256dh", "auth", "created_at"} <= push_columns
    assert "uq_push_subscriptions_endpoint_hash" in push_uniques


def test_la_migracio_es_pot_desfer_sense_perdre_les_reserves(tmp_path: Path) -> None:
    url = f"sqlite:///{tmp_path / 'espais.sqlite3'}"
    cfg = _config(url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "0011_email_verification")
    engine = create_engine(url)
    try:
        insp = inspect(engine)
        assert "push_subscriptions" not in insp.get_table_names()
        assert "managed_by_responsible" not in {column["name"] for column in insp.get_columns("reservations")}
    finally:
        engine.dispose()
    command.upgrade(cfg, "head")
