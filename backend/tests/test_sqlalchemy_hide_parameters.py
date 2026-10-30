"""Un error de base de dades no escriu els paràmetres SQL ni al text ni al log."""

import logging
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.exc import StatementError

from app.adapters.sqlalchemy.engine import make_engine

SECRET = "hash-fictici-no-es-una-contrasenya"
ROW_ID = "usuari-fictici-1"


def test_un_error_de_base_no_mostra_els_parametres(tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
    engine = make_engine(f"sqlite:///{tmp_path / 'espais.sqlite3'}")
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE secrets (id TEXT PRIMARY KEY, secret TEXT)"))
            connection.execute(text("CREATE TRIGGER refuse BEFORE INSERT ON secrets BEGIN SELECT RAISE(ABORT, 'refusat'); END"))
        with caplog.at_level(logging.ERROR), pytest.raises(StatementError) as caught:
            try:
                with engine.begin() as connection:
                    connection.execute(
                        text("INSERT INTO secrets (id, secret) VALUES (:id, :secret)"),
                        {"id": ROW_ID, "secret": SECRET},
                    )
            except StatementError:
                logging.getLogger("app.sql").exception("no s’ha pogut desar")
                raise
    finally:
        engine.dispose()

    message = str(caught.value)
    assert SECRET not in message
    assert ROW_ID not in message
    assert "refusat" in message
    assert "hide_parameters=True" in message
    assert SECRET not in caplog.text
    assert ROW_ID not in caplog.text
    assert "refusat" in caplog.text
