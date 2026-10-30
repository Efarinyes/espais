"""L’API de recuperació no revela si el compte existeix, no obre sessió i tanca les sessions velles."""

import hashlib
import hmac
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.adapters.system import SystemClock
from app.adapters.tokens import HmacTokenIssuer, _b64url_encode
from app.main import create_app
from app.ports.password_reset_mail import PasswordResetMessage

SECRET = "secret-test"
DETALL_RECUPERACIO = (
    "Si aquest correu té un compte, rebràs un enllaç per triar una contrasenya nova. "
    "Caduca al cap d’una hora."
)
DETALL_CANVI = "La contrasenya s’ha actualitzat correctament. Ara pots iniciar sessió."


class CapturingMailer:
    def __init__(self, *, fail: bool = False) -> None:
        self.messages: list[PasswordResetMessage] = []
        self.fail = fail

    def configured(self) -> bool:
        return True

    def send(self, message: PasswordResetMessage) -> None:
        if self.fail:
            raise ConnectionRefusedError("smtp caigut")
        self.messages.append(message)

    def token_per(self, email: str) -> str:
        return [m.token for m in self.messages if m.to_email == email][-1]


def _client(sqlite_session_factory, mailer: CapturingMailer) -> TestClient:
    app = create_app(
        session_factory=sqlite_session_factory,
        token_issuer=HmacTokenIssuer(SECRET, SystemClock()),
    )
    app.state.password_reset_mailer = mailer
    return TestClient(app)


def _registre(client: TestClient, email: str = "anna@example.com") -> dict[str, object]:
    response = client.post(
        "/registre",
        json={
            "entity_name": "AAVV Barri A",
            "typology": "associació de veïns",
            "responsible_name": "Anna",
            "email": email,
            "password": "secret123",
        },
    )
    assert response.status_code == 201
    return response.json()


def _coordinador(client: TestClient, token_responsable: str, email: str = "carla@example.com") -> dict[str, object]:
    invited = client.post(
        "/invitacions",
        headers={"Authorization": f"Bearer {token_responsable}"},
        json={"email": email},
    )
    assert invited.status_code == 201
    invite_token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    accepted = client.post(
        f"/invitacions/{invite_token}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    assert accepted.status_code == 201
    return accepted.json()


def _h(token: object) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _login(client: TestClient, email: str, password: str):  # type: ignore[no-untyped-def]
    return client.post("/sessio", json={"email": email, "password": password})


def _recupera(client: TestClient, mailer: CapturingMailer, email: str, password: str = "nova-clau-1"):  # type: ignore[no-untyped-def]
    assert client.post("/recuperacio", json={"email": email}).json()["detall"] == DETALL_RECUPERACIO
    return client.post(
        "/recuperacio/confirmacio",
        json={"token": mailer.token_per(email), "password": password},
    )


def _slot() -> tuple[str, str]:
    start = datetime(2026, 9, 8, 10, 0, tzinfo=ZoneInfo("Europe/Madrid"))
    return start.isoformat(), (start + timedelta(hours=1)).isoformat()


def test_la_resposta_es_la_mateixa_si_el_compte_existeix_o_no(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    _registre(client)
    existent = client.post("/recuperacio", json={"email": "anna@example.com"})
    absent = client.post("/recuperacio", json={"email": "ningú@example.com"})
    buit = client.post("/recuperacio", json={})
    assert existent.status_code == absent.status_code == buit.status_code == 200
    assert existent.json() == absent.json() == buit.json() == {"detall": DETALL_RECUPERACIO}
    assert [m.to_email for m in mailer.messages] == ["anna@example.com"]


def test_la_resposta_no_canvia_si_el_correu_falla_o_hi_ha_limit(sqlite_session_factory) -> None:
    mailer = CapturingMailer(fail=True)
    client = _client(sqlite_session_factory, mailer)
    _registre(client)
    respostes = [client.post("/recuperacio", json={"email": "anna@example.com"}) for _ in range(5)]
    assert {r.status_code for r in respostes} == {200}
    assert {r.json()["detall"] for r in respostes} == {DETALL_RECUPERACIO}


def test_confirmar_no_obre_sessio_i_tanca_les_anteriors(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    registre = _registre(client)
    segon_login = _login(client, "anna@example.com", "secret123").json()["token"]
    for antic in (registre["token"], segon_login):
        assert client.get("/sessio", headers=_h(antic)).status_code == 200

    canvi = _recupera(client, mailer, "anna@example.com")
    assert canvi.status_code == 200
    assert canvi.json() == {"detall": DETALL_CANVI}
    assert "token" not in canvi.json()

    for antic in (registre["token"], segon_login):
        assert client.get("/sessio", headers=_h(antic)).status_code == 401
        assert client.get("/espais", headers=_h(antic)).status_code == 401
        assert client.post("/espais", headers=_h(antic), json={"name": "Sala", "capacity": 5}).status_code == 401
        assert client.post("/sessio/tancament", headers=_h(antic)).status_code == 401
    assert _login(client, "anna@example.com", "secret123").status_code == 401
    nou = _login(client, "anna@example.com", "nova-clau-1")
    assert nou.status_code == 200
    assert nou.json()["role"] == "responsible"
    assert client.get("/sessio", headers=_h(nou.json()["token"])).status_code == 200


def test_el_token_de_recuperacio_no_serveix_com_a_sessio(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    _registre(client)
    client.post("/recuperacio", json={"email": "anna@example.com"})
    token = mailer.token_per("anna@example.com")
    assert client.get("/sessio", headers=_h(token)).status_code == 401


def test_enllac_usat_inventat_o_buit_respon_410_igual(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    _registre(client)
    assert _recupera(client, mailer, "anna@example.com").status_code == 200
    usat = client.post(
        "/recuperacio/confirmacio",
        json={"token": mailer.token_per("anna@example.com"), "password": "altra-clau"},
    )
    inventat = client.post("/recuperacio/confirmacio", json={"token": "inventat", "password": "altra-clau"})
    buit = client.post("/recuperacio/confirmacio", json={"token": "", "password": "altra-clau"})
    assert usat.status_code == inventat.status_code == buit.status_code == 410
    assert usat.json() == inventat.json() == buit.json()
    assert "enllaç" in usat.json()["detail"]
    assert _login(client, "anna@example.com", "altra-clau").status_code == 401


def test_una_contrasenya_curta_o_massa_llarga_es_rebutja_sense_gastar_el_token(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    _registre(client)
    client.post("/recuperacio", json={"email": "anna@example.com"})
    token = mailer.token_per("anna@example.com")
    curta = client.post("/recuperacio/confirmacio", json={"token": token, "password": "curta"})
    llarga = client.post("/recuperacio/confirmacio", json={"token": token, "password": "à" * 37})
    assert (curta.status_code, curta.json()["detail"]) == (400, "la contrasenya és massa curta")
    assert (llarga.status_code, llarga.json()["detail"]) == (400, "la contrasenya és massa llarga")
    assert client.post("/recuperacio/confirmacio", json={"token": token, "password": "nova-clau-1"}).status_code == 200


def test_una_demanda_nova_anul_la_l_enllac_anterior(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    _registre(client)
    client.post("/recuperacio", json={"email": "anna@example.com"})
    primer = mailer.token_per("anna@example.com")
    client.post("/recuperacio", json={"email": "anna@example.com"})
    assert client.post("/recuperacio/confirmacio", json={"token": primer, "password": "nova-clau-1"}).status_code == 410
    segon = mailer.token_per("anna@example.com")
    assert client.post("/recuperacio/confirmacio", json={"token": segon, "password": "nova-clau-1"}).status_code == 200


def test_el_limit_per_compte_no_envia_el_quart_correu(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    _registre(client)
    for _ in range(4):
        assert client.post("/recuperacio", json={"email": "anna@example.com"}).status_code == 200
    assert len(mailer.messages) == 3


def test_una_capcalera_xff_d_un_client_public_no_esquiva_el_limit(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    _registre(client)
    for index in range(10):
        client.post(
            "/recuperacio",
            json={"email": f"ningú{index}@example.com"},
            headers={"X-Forwarded-For": f"198.51.100.{index}"},
        )
    client.post(
        "/recuperacio",
        json={"email": "anna@example.com"},
        headers={"X-Forwarded-For": "203.0.113.50"},
    )
    assert mailer.messages == []


def test_el_coordinador_recupera_conserva_el_rol_i_els_permisos(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    responsable = _registre(client)
    space = client.post("/espais", headers=_h(responsable["token"]), json={"name": "Sala 1", "capacity": 20})
    assert space.status_code == 201
    coordinador = _coordinador(client, responsable["token"])

    assert _recupera(client, mailer, "carla@example.com").status_code == 200
    assert client.get("/sessio", headers=_h(coordinador["token"])).status_code == 401
    assert client.get("/sessio", headers=_h(responsable["token"])).status_code == 200

    nou = _login(client, "carla@example.com", "nova-clau-1")
    assert nou.status_code == 200
    assert nou.json()["role"] == "coordinator"
    headers = _h(nou.json()["token"])
    start, end = _slot()
    reserva = client.post("/reserves", headers=headers, json={"space_id": space.json()["id"], "starts_at": start, "ends_at": end})
    assert reserva.status_code == 201
    assert client.post("/espais", headers=headers, json={"name": "Sala 2", "capacity": 5}).status_code == 403
    assert client.post("/invitacions", headers=headers, json={"email": "altra@example.com"}).status_code == 403
    assert client.patch("/entitat/paleta", headers=headers, json={"palette": "camps"}).status_code == 403
    assert client.get("/analisi", headers=headers, params={"des": start, "fins": end}).status_code == 403
    assert client.post(f"/reserves/{reserva.json()['id']}/anulacio", headers=headers).status_code == 200


def test_el_responsable_recupera_i_conserva_els_permisos(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    responsable = _registre(client)
    coordinador = _coordinador(client, responsable["token"])

    assert _recupera(client, mailer, "anna@example.com").status_code == 200
    assert client.get("/sessio", headers=_h(responsable["token"])).status_code == 401
    assert client.get("/sessio", headers=_h(coordinador["token"])).status_code == 200

    nou = _login(client, "anna@example.com", "nova-clau-1")
    assert nou.json()["role"] == "responsible"
    headers = _h(nou.json()["token"])
    start, end = _slot()
    assert client.post("/espais", headers=headers, json={"name": "Sala 2", "capacity": 5}).status_code == 201
    assert client.get("/analisi", headers=headers, params={"des": start, "fins": end}).status_code == 200
    assert client.post("/invitacions", headers=headers, json={"email": "altra@example.com"}).status_code == 201


def test_un_token_revocat_continua_revocat_despres_de_recuperar(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    registre = _registre(client)
    assert client.post("/sessio/tancament", headers=_h(registre["token"])).status_code == 204
    assert _recupera(client, mailer, "anna@example.com").status_code == 200
    assert client.get("/sessio", headers=_h(registre["token"])).status_code == 401


def test_un_token_antic_sense_versio_val_fins_que_es_recupera_el_compte(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    user_id = _registre(client)["user_id"]
    payload = {"sub": str(user_id), "exp": int(SystemClock().now().timestamp()) + 600}
    body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = _b64url_encode(hmac.new(SECRET.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest())
    legacy = f"{body}.{signature}"
    assert client.get("/sessio", headers=_h(legacy)).status_code == 200
    assert _recupera(client, mailer, "anna@example.com").status_code == 200
    assert client.get("/sessio", headers=_h(legacy)).status_code == 401


def test_registre_i_invitacio_rebutgen_una_contrasenya_massa_llarga(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    llarga = client.post(
        "/registre",
        json={
            "entity_name": "AAVV",
            "typology": None,
            "responsible_name": "Anna",
            "email": "llarga@example.com",
            "password": "x" * 73,
        },
    )
    assert (llarga.status_code, llarga.json()["detail"]) == (400, "la contrasenya és massa llarga")
    responsable = _registre(client)
    invited = client.post("/invitacions", headers=_h(responsable["token"]), json={"email": "carla@example.com"})
    invite_token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    accepted = client.post(f"/invitacions/{invite_token}/acceptar", json={"name": "Carla", "password": "x" * 73})
    assert accepted.status_code == 400
    assert accepted.json()["detail"] == "la contrasenya és massa llarga"
