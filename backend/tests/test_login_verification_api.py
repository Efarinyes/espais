"""El login no concedeix la sessió fins que el codi d’aquella connexió és correcte."""

from __future__ import annotations

import socket
import threading
import time
from datetime import UTC, datetime, timedelta

import httpx
import socketio
import uvicorn
from fastapi.testclient import TestClient

from app.adapters.login_socket import tanca_connexio
from app.domain.login_verification import COOLDOWN, MAX_ATTEMPTS
from app.main import create_app
from tests.alta_http import alta_i_sessio
from tests.sessio_http import inicia_sessio


class Rellotge:
    def __init__(self) -> None:
        self.moment = datetime(2026, 11, 18, 16, 0, tzinfo=UTC)

    def now(self) -> datetime:
        return self.moment


def _client(factory, clock: Rellotge | None = None) -> TestClient:  # type: ignore[no-untyped-def]
    application = create_app(session_factory=factory)
    if clock is not None:
        application.state.clock = clock
    return TestClient(application)


def _codi(client: TestClient, email: str = "anna@example.com", password: str = "secret123"):  # type: ignore[no-untyped-def]
    hub = client.app.state.login_hub
    channel = hub.open()
    started = client.post("/sessio", json={"email": email, "password": password, "channel": channel})
    return channel, started, hub.last_code(channel)


def test_no_hi_ha_sessio_abans_de_verificar_i_el_codi_no_surt_a_la_resposta(sqlite_session_factory, caplog) -> None:  # type: ignore[no-untyped-def]
    client = _client(sqlite_session_factory)
    alta_i_sessio(client)
    caplog.set_level("DEBUG")
    channel, started, code = _codi(client)
    assert started.status_code == 200
    assert code
    assert "token" not in started.json()
    assert code not in started.text
    assert code not in caplog.text
    assert "secret123" not in caplog.text
    assert client.get("/espais", headers={"Authorization": f"Bearer {started.json()['challenge_id']}"}).status_code == 401
    dolent = client.post(
        "/sessio/verificacio",
        json={"challenge_id": started.json()["challenge_id"], "code": "000000", "channel": channel},
    )
    assert dolent.status_code == 400
    assert dolent.json()["detail"] == "El codi no és correcte."
    assert client.get("/sessio").status_code == 401
    bo = client.post(
        "/sessio/verificacio",
        json={"challenge_id": started.json()["challenge_id"], "code": code, "channel": channel},
    )
    assert bo.status_code == 200
    assert bo.json()["role"] == "responsible"
    assert bo.json()["token"]
    assert client.get("/sessio", headers={"Authorization": f"Bearer {bo.json()['token']}"}).status_code == 200
    reus = client.post(
        "/sessio/verificacio",
        json={"challenge_id": started.json()["challenge_id"], "code": code, "channel": channel},
    )
    assert reus.status_code == 410
    assert "ja s’ha fet servir" in reus.json()["detail"]


def test_dos_canals_no_comparteixen_el_codi_i_el_coordinador_entra_igual(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    client = _client(sqlite_session_factory)
    responsable = alta_i_sessio(client)
    canal_a, inici_a, codi_a = _codi(client)
    canal_b, inici_b, codi_b = _codi(client)
    assert inici_a.status_code == inici_b.status_code == 200
    assert codi_a and codi_b
    creuat = client.post(
        "/sessio/verificacio",
        json={"challenge_id": inici_a.json()["challenge_id"], "code": codi_a, "channel": canal_b},
    )
    assert creuat.status_code == 410
    assert "aquesta connexió" in creuat.json()["detail"]
    propi = client.post(
        "/sessio/verificacio",
        json={"challenge_id": inici_a.json()["challenge_id"], "code": codi_a, "channel": canal_a},
    )
    assert propi.status_code == 200
    assert propi.json()["token"]
    assert client.get("/sessio", headers={"Authorization": f"Bearer {responsable['token']}"}).status_code == 200

    invited = client.post(
        "/invitacions",
        headers={"Authorization": f"Bearer {responsable['token']}"},
        json={"email": "carla@example.com"},
    )
    assert invited.status_code == 201
    acceptat = client.post(
        f"/invitacions/{invited.json()['accept_url'].rsplit('/', 1)[-1]}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    assert acceptat.status_code == 201
    assert acceptat.json()["role"] == "coordinator"
    coord = inicia_sessio(client, "carla@example.com", "secret123")
    assert coord.status_code == 200
    assert coord.json()["role"] == "coordinator"
    assert client.get("/sessio", headers={"Authorization": f"Bearer {acceptat.json()['token']}"}).status_code == 200
    assert client.get("/sessio", headers={"Authorization": f"Bearer {coord.json()['token']}"}).status_code == 200


def test_caducitat_intents_desconnexio_i_repeticio(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    clock = Rellotge()
    client = _client(sqlite_session_factory, clock)
    alta_i_sessio(client)
    canal, inici, codi = _codi(client)
    assert inici.status_code == 200
    repetit = client.post("/sessio", json={"email": "anna@example.com", "password": "secret123", "channel": canal})
    assert repetit.status_code == 429
    assert "Espera uns segons" in repetit.json()["detail"]
    encara = client.post(
        "/sessio/verificacio",
        json={"challenge_id": inici.json()["challenge_id"], "code": codi, "channel": canal},
    )
    assert encara.status_code == 200

    clock.moment += COOLDOWN
    canal, inici, codi = _codi(client)
    respostes = [
        client.post(
            "/sessio/verificacio",
            json={"challenge_id": inici.json()["challenge_id"], "code": "000000", "channel": canal},
        )
        for _ in range(MAX_ATTEMPTS)
    ]
    assert [resposta.status_code for resposta in respostes] == [400, 400, 400, 400, 410]
    assert "exhaurit" in respostes[-1].json()["detail"]
    encara_bo = client.post(
        "/sessio/verificacio",
        json={"challenge_id": inici.json()["challenge_id"], "code": codi, "channel": canal},
    )
    assert encara_bo.status_code == 410

    clock.moment += COOLDOWN
    canal, inici, codi = _codi(client)
    clock.moment += timedelta(minutes=2)
    caducat = client.post(
        "/sessio/verificacio",
        json={"challenge_id": inici.json()["challenge_id"], "code": codi, "channel": canal},
    )
    assert caducat.status_code == 410
    assert "caducat" in caducat.json()["detail"]

    clock.moment += COOLDOWN
    canal, inici, codi = _codi(client)
    sid = client.app.state.login_hub.sid_for(canal)
    tanca_connexio(client.app.state.login_hub, client.app.state.login_challenges, sid, clock.now())
    tallat = client.post(
        "/sessio/verificacio",
        json={"challenge_id": inici.json()["challenge_id"], "code": codi, "channel": canal},
    )
    assert tallat.status_code == 410
    assert "connexió" in tallat.json()["detail"]


def test_la_contrasenya_dolenta_segueix_sent_401_i_sense_canal_no_hi_ha_sessio(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    client = _client(sqlite_session_factory)
    alta_i_sessio(client)
    dolenta = client.post("/sessio", json={"email": "anna@example.com", "password": "no-es-aquesta"})
    assert dolenta.status_code == 401
    sense_canal = client.post("/sessio", json={"email": "anna@example.com", "password": "secret123"})
    assert sense_canal.status_code == 400
    assert "token" not in sense_canal.json()
    assert client.get("/sessio").status_code == 401


def _port_lliure() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def test_el_socket_nomes_lliura_el_codi_a_la_connexio_que_inicia(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    application = create_app(session_factory=sqlite_session_factory)
    port = _port_lliure()
    server = uvicorn.Server(
        uvicorn.Config(
            application.state.asgi,
            host="127.0.0.1",
            port=port,
            log_level="error",
            access_log=False,
        )
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    try:
        for _ in range(100):
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=0.1):
                    break
            except OSError:
                time.sleep(0.05)
        else:
            raise RuntimeError("el servidor de prova no ha arrencat")

        base = f"http://127.0.0.1:{port}"
        alta = httpx.post(
            f"{base}/registre",
            json={
                "entity_name": "Entitat Socket",
                "typology": "associació",
                "responsible_name": "Rita",
                "email": "rita.socket@example.com",
                "password": "secret123",
            },
            timeout=10,
        )
        assert alta.status_code == 201
        db = application.state.session_factory()
        try:
            from tests.alta_http import _activar

            _activar(db, "rita.socket@example.com")
        finally:
            db.close()

        rebuts: dict[str, list[dict[str, str]]] = {"a": [], "b": []}
        client_a = socketio.Client(reconnection=False)
        client_b = socketio.Client(reconnection=False)
        client_a.on("verificacio:codi", lambda data: rebuts["a"].append(data))
        client_b.on("verificacio:codi", lambda data: rebuts["b"].append(data))
        canals: dict[str, str] = {}
        client_a.on("verificacio:canal", lambda data: canals.setdefault("a", data["channel"]))
        client_b.on("verificacio:canal", lambda data: canals.setdefault("b", data["channel"]))
        client_a.connect(base, transports=["polling"], wait_timeout=5)
        client_b.connect(base, transports=["polling"], wait_timeout=5)
        for _ in range(50):
            if canals.get("a") and canals.get("b"):
                break
            time.sleep(0.05)
        assert canals["a"] and canals["a"] != canals["b"]

        inici = httpx.post(
            f"{base}/sessio",
            json={"email": "rita.socket@example.com", "password": "secret123", "channel": canals["a"]},
            timeout=10,
        )
        assert inici.status_code == 200, inici.text
        assert "code" not in inici.json()
        assert "token" not in inici.json()
        for _ in range(50):
            if rebuts["a"]:
                break
            time.sleep(0.05)
        assert len(rebuts["a"]) == 1
        assert rebuts["b"] == []
        assert rebuts["a"][0]["challenge_id"] == inici.json()["challenge_id"]
        assert rebuts["a"][0]["code"] not in inici.text

        aliè = httpx.post(
            f"{base}/sessio/verificacio",
            json={
                "challenge_id": inici.json()["challenge_id"],
                "code": rebuts["a"][0]["code"],
                "channel": canals["b"],
            },
            timeout=10,
        )
        assert aliè.status_code == 410
        sessio = httpx.post(
            f"{base}/sessio/verificacio",
            json={
                "challenge_id": inici.json()["challenge_id"],
                "code": rebuts["a"][0]["code"],
                "channel": canals["a"],
            },
            timeout=10,
        )
        assert sessio.status_code == 200, sessio.text
        assert sessio.json()["role"] == "responsible"
        assert sessio.json()["token"]
        viu = httpx.get(f"{base}/sessio", headers={"Authorization": f"Bearer {sessio.json()['token']}"}, timeout=10)
        assert viu.status_code == 200
        client_a.disconnect()
        client_b.disconnect()
    finally:
        server.should_exit = True
        thread.join(timeout=5)
