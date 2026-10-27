"""Vora pública: OpenAPI només fora de producció, i Caddy sense canviar el prefix /api."""

from fastapi.testclient import TestClient

from app.adapters.sqlalchemy.engine import repo_root
from app.main import create_app

CAPCALERES = (
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Content-Security-Policy",
)


def test_desenvolupament_publica_openapi(sqlite_session_factory, monkeypatch) -> None:
    monkeypatch.delenv("ESPAIS_ENV", raising=False)
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    esquema = client.get("/openapi.json")
    assert esquema.status_code == 200
    assert esquema.json()["info"]["title"] == "Espais"
    assert client.get("/docs").status_code == 200
    assert client.get("/redoc").status_code == 200
    assert client.get("/salut").status_code == 200


def test_produccio_amaga_openapi_i_manté_salut(sqlite_session_factory, monkeypatch) -> None:
    monkeypatch.setenv("ESPAIS_ENV", "production")
    monkeypatch.setenv("ESPAIS_SECRET", "un-secret-de-camp")
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404
    salut = client.get("/salut")
    assert salut.status_code == 200
    assert salut.json() == {"estat": "ok"}


def test_caddy_posa_capcaleres_i_treu_el_prefix_api() -> None:
    text = (repo_root() / "docker" / "Caddyfile").read_text(encoding="utf-8")
    for nom in CAPCALERES:
        assert nom in text
    assert "handle_path /api/*" in text
    assert "reverse_proxy backend:8000" in text
    assert "handle /api/" not in text
    assert "rewrite" not in text


def test_el_tema_inicial_no_és_un_script_en_línia() -> None:
    html = (repo_root() / "frontend" / "index.html").read_text(encoding="utf-8")
    script = (repo_root() / "frontend" / "public" / "tema-inicial.js").read_text(encoding="utf-8")
    assert 'src="/tema-inicial.js"' in html
    assert "espais.mode" not in html
    assert "espais.mode" in script
    assert "script-src 'self'" in (repo_root() / "docker" / "Caddyfile").read_text(encoding="utf-8")
    assert "script-src 'self' 'unsafe-inline'" not in (
        repo_root() / "docker" / "Caddyfile"
    ).read_text(encoding="utf-8")


def test_el_gra_de_daisyui_no_es_demana_sota_la_csp() -> None:
    caddy = (repo_root() / "docker" / "Caddyfile").read_text(encoding="utf-8")
    css = (repo_root() / "frontend" / "src" / "styles.css").read_text(encoding="utf-8")
    assert "img-src 'self'" in caddy
    assert "img-src 'self' data:" not in caddy
    assert "--fx-noise: none" in css
