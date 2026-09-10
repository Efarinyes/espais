from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, inspect

from alembic import command


def test_alembic_upgrade_creates_identity_tables(tmp_path: Path) -> None:
    db_path = tmp_path / "espais.sqlite3"
    url = f"sqlite:///{db_path}"
    repo_root = Path(__file__).resolve().parents[2]
    cfg = Config(str(repo_root / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")

    engine = create_engine(url)
    try:
        names = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()

    assert {"entities", "users", "memberships", "spaces", "space_availability_windows", "attendance_records", "notifications", "alembic_version"} <= names
