from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def test_salut_returns_ok(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'salut.sqlite3'}")
    client = TestClient(create_app())
    response = client.get("/salut")
    assert response.status_code == 200
    assert response.json() == {"estat": "ok"}
