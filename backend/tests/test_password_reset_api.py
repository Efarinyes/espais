"""L’API de recuperació no revela si el compte existeix i tanca les sessions velles."""

from fastapi.testclient import TestClient

from app.main import create_app
from app.ports.password_reset_mail import PasswordResetMessage


class CapturingMailer:
    def __init__(self) -> None:
        self.messages: list[PasswordResetMessage] = []

    def configured(self) -> bool:
        return True

    def send(self, message: PasswordResetMessage) -> None:
        self.messages.append(message)


def _payload(**overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    return data


def test_la_resposta_es_la_mateixa_si_el_compte_existeix_o_no(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    app = create_app(session_factory=sqlite_session_factory)
    app.state.password_reset_mailer = mailer
    client = TestClient(app)
    client.post("/registre", json=_payload())
    existent = client.post("/recuperacio", json={"email": "anna@example.com"})
    absent = client.post("/recuperacio", json={"email": "ningú@example.com"})
    assert existent.status_code == 200
    assert absent.status_code == 200
    assert existent.json() == absent.json()
    assert "compte" in existent.json()["detall"]
    assert len(mailer.messages) == 1


def test_confirmar_invalida_la_sessio_anterior_i_n_obre_una_de_nova(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    app = create_app(session_factory=sqlite_session_factory)
    app.state.password_reset_mailer = mailer
    client = TestClient(app)
    antic = client.post("/registre", json=_payload()).json()["token"]
    client.post("/recuperacio", json={"email": "anna@example.com"})
    nova = client.post(
        "/recuperacio/confirmacio",
        json={"token": mailer.messages[0].token, "password": "nova-clau-1"},
    )
    assert nova.status_code == 200
    assert nova.json()["token"]
    assert client.get("/sessio", headers={"Authorization": f"Bearer {antic}"}).status_code == 401
    assert (
        client.get("/sessio", headers={"Authorization": f"Bearer {nova.json()['token']}"}).status_code
        == 200
    )
    assert client.post("/sessio", json={"email": "anna@example.com", "password": "secret123"}).status_code == 401
    assert (
        client.post("/sessio", json={"email": "anna@example.com", "password": "nova-clau-1"}).status_code
        == 200
    )


def test_un_enllac_consumit_o_curt_no_canvia_la_contrasenya(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    app = create_app(session_factory=sqlite_session_factory)
    app.state.password_reset_mailer = mailer
    client = TestClient(app)
    client.post("/registre", json=_payload())
    client.post("/recuperacio", json={"email": "anna@example.com"})
    token = mailer.messages[0].token
    curt = client.post("/recuperacio/confirmacio", json={"token": token, "password": "curta"})
    assert curt.status_code == 400
    assert "curta" in curt.json()["detail"]
    fet = client.post("/recuperacio/confirmacio", json={"token": token, "password": "nova-clau-1"})
    assert fet.status_code == 200
    repetit = client.post(
        "/recuperacio/confirmacio", json={"token": token, "password": "altra-clau"}
    )
    assert repetit.status_code == 400
    assert "enllaç" in repetit.json()["detail"]


def test_una_capcalera_xff_d_un_client_public_no_esquiva_el_limit(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    app = create_app(session_factory=sqlite_session_factory)
    app.state.password_reset_mailer = mailer
    client = TestClient(app)
    client.post("/registre", json=_payload())
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
