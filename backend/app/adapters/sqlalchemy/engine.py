"""Motor SQLAlchemy. SQLite per defecte; URL via DATABASE_URL."""

from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def database_url() -> str:
    configured = os.environ.get("DATABASE_URL")
    if configured:
        return configured
    return f"sqlite:///{repo_root() / 'espais.sqlite3'}"


def _enable_sqlite_foreign_keys(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def make_engine(url: str | None = None) -> Engine:
    resolved = url or database_url()
    kwargs: dict[str, object] = {"future": True}
    if resolved.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
        if resolved in {"sqlite://", "sqlite:///:memory:"}:
            kwargs["poolclass"] = StaticPool
    engine = create_engine(resolved, **kwargs)
    if resolved.startswith("sqlite"):
        _enable_sqlite_foreign_keys(engine)
    return engine


def make_session_factory(engine: Engine) -> sessionmaker:
    return sessionmaker(bind=engine, expire_on_commit=False, future=True)
