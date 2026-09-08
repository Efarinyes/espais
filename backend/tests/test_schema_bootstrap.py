from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect

from app.adapters.sqlalchemy.engine import database_url, repo_root
from app.main import create_app


def test_default_sqlite_url_is_absolute_under_repo(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    url = database_url()
    path = Path(url.removeprefix("sqlite:///"))
    assert path.is_absolute()
    assert path.name == "espais.sqlite3"
    assert path.parent == repo_root()


def test_app_startup_migrates_spaces_and_persists(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "espais.sqlite3"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    client = TestClient(create_app())
    created = client.post(
        "/registre",
        json={
            "entity_name": "AAVV Barri A",
            "typology": "associació de veïns",
            "responsible_name": "Anna",
            "email": "anna-boot@example.com",
            "password": "secret123",
        },
    )
    assert created.status_code == 201
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    posted = client.post("/espais", headers=headers, json={"name": "Sala 1", "capacity": 40})
    assert posted.status_code == 201
    listed = client.get("/espais", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["name"] == "Sala 1"

    engine = create_engine(f"sqlite:///{db_path}")
    try:
        names = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()
    assert "spaces" in names
    assert "invitations" in names
    assert "reservations" in names
