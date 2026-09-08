from fastapi.testclient import TestClient

from app.main import create_app


def test_salut_returns_ok() -> None:
    client = TestClient(create_app())
    response = client.get("/salut")
    assert response.status_code == 200
    assert response.json() == {"estat": "ok"}
