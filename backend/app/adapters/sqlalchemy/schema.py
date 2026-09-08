"""Esquema SQLite: Alembic a l’arrencada, sense pas manual."""

from __future__ import annotations

from alembic.config import Config
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.adapters.sqlalchemy.engine import database_url, make_engine, make_session_factory, repo_root


def apply_sqlite_migrations(url: str) -> None:
    if not url.startswith("sqlite"):
        return
    if ":memory:" in url or url in {"sqlite://", "sqlite:///"}:
        return
    cfg = Config(str(repo_root() / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")


def bootstrap_session_factory() -> sessionmaker:
    url = database_url()
    engine = make_engine(url)
    apply_sqlite_migrations(url)
    return make_session_factory(engine)
