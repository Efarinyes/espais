import logging
from pathlib import Path
from uuid import UUID

from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.adapters.sqlalchemy.identity import SqlAlchemyIdentityUnitOfWork


def _config(url: str) -> Config:
    repo_root = Path(__file__).resolve().parents[2]
    cfg = Config(str(repo_root / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def test_alembic_upgrade_creates_identity_tables(tmp_path: Path) -> None:
    db_path = tmp_path / "espais.sqlite3"
    url = f"sqlite:///{db_path}"
    command.upgrade(_config(url), "head")

    engine = create_engine(url)
    try:
        names = set(inspect(engine).get_table_names())
        user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    finally:
        engine.dispose()

    assert {"entities", "users", "memberships", "spaces", "space_availability_windows", "attendance_records", "notifications", "alembic_version"} <= names
    assert {"revoked_tokens", "password_resets", "recovery_attempts"} <= names
    assert "session_version" in user_columns


def test_les_migracions_de_l_arrencada_no_apaguen_els_logs_de_l_app(tmp_path: Path) -> None:
    logger = logging.getLogger("app.usecases.request_password_reset")
    command.upgrade(_config(f"sqlite:///{tmp_path / 'espais.sqlite3'}"), "head")
    assert logger.disabled is False


def test_la_migracio_de_recuperacio_conserva_els_comptes_existents(tmp_path: Path) -> None:
    url = f"sqlite:///{tmp_path / 'espais.sqlite3'}"
    cfg = _config(url)
    command.upgrade(cfg, "0009_revoked_tokens")
    engine = create_engine(url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO users (id, name, email, password_hash, created_at) "
                    "VALUES (:id, 'Anna', 'anna@example.com', 'hash-antic', '2026-09-08 12:00:00.000000')"
                ),
                {"id": UUID(int=1).hex},
            )
        command.upgrade(cfg, "head")
        uow = SqlAlchemyIdentityUnitOfWork(sessionmaker(bind=engine, expire_on_commit=False, future=True))
        try:
            user = uow.users.get_by_email("anna@example.com")
        finally:
            uow.close()
    finally:
        engine.dispose()

    assert user is not None
    assert user.id == UUID(int=1)
    assert user.password_hash == "hash-antic"
    assert user.session_version == 0
