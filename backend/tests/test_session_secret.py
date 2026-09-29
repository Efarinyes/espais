import pytest

from app.adapters.tokens import DEV_SESSION_SECRET, session_secret
from app.main import create_app


def test_desenvolupament_sense_secret_usa_el_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ESPAIS_ENV", raising=False)
    monkeypatch.delenv("ESPAIS_SECRET", raising=False)
    assert session_secret() == DEV_SESSION_SECRET


def test_produccio_sense_secret_no_arrenca(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ESPAIS_ENV", "production")
    monkeypatch.delenv("ESPAIS_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="ESPAIS_SECRET"):
        create_app()


def test_produccio_rebutja_el_placeholder(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ESPAIS_ENV", "production")
    monkeypatch.setenv("ESPAIS_SECRET", "CHANGE_ME")
    with pytest.raises(RuntimeError, match="ESPAIS_SECRET"):
        session_secret()


def test_produccio_rebutja_el_secret_de_desenvolupament(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ESPAIS_ENV", "production")
    monkeypatch.setenv("ESPAIS_SECRET", DEV_SESSION_SECRET)
    with pytest.raises(RuntimeError, match="ESPAIS_SECRET"):
        session_secret()


def test_produccio_accepta_un_secret_propi(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ESPAIS_ENV", "production")
    monkeypatch.setenv("ESPAIS_SECRET", "un-secret-de-camp")
    assert session_secret() == "un-secret-de-camp"
