"""L’API de verificació no obre sessió i no diu si el correu existeix."""

from fastapi.testclient import TestClient

from app.main import create_app
from app.ports.email_verification_mail import EmailVerificationMessage
from app.ports.password_reset_mail import PasswordResetMessage

DETALL_REENVIAMENT = (
    "Si aquest correu té un registre pendent de verificar, rebràs un enllaç. "
    "Caduca al cap de 24 hores."
)
DETALL_VERIFICAT = (
    "El correu s’ha verificat i l’entitat ja està activa. Ara pots iniciar sessió."
)
DETALL_ENLLAC = "Aquest enllaç no és vàlid o ha caducat. Demana’n un de nou."


class CapturingMailer:
    def __init__(self, *, fail: bool = False) -> None:
        self.messages: list[EmailVerificationMessage] = []
        self.fail = fail

    def configured(self) -> bool:
        return True

    def send(self, message: EmailVerificationMessage) -> None:
        if self.fail:
            raise ConnectionRefusedError("smtp caigut")
        self.messages.append(message)


class ResetMailer:
    def __init__(self) -> None:
        self.messages: list[PasswordResetMessage] = []

    def configured(self) -> bool:
        return True

    def send(self, message: PasswordResetMessage) -> None:
        self.messages.append(message)


def _client(sqlite_session_factory, mailer: CapturingMailer, reset: ResetMailer | None = None) -> TestClient:
    app = create_app(session_factory=sqlite_session_factory)
    app.state.email_verification_mailer = mailer
    if reset is not None:
        app.state.password_reset_mailer = reset
    return TestClient(app)


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


def test_verificar_el_correu_permet_entrar_i_un_token_usat_no(sqlite_session_factory) -> None:
    mailer = CapturingMailer()
    client = _client(sqlite_session_factory, mailer)
    alta = client.post("/registre", json=_payload())
    assert alta.status_code == 201
    assert alta.json()["lliurament"] == "sent"
    assert "token" not in alta.json()
    bloquejat = client.post("/sessio", json={"email": "anna@example.com", "password": "secret123"})
    assert bloquejat.status_code == 403
    dolenta = client.post("/sessio", json={"email": "anna@example.com", "password": "no"})
    assert dolenta.status_code == 401

    token = mailer.messages[0].token
    confirmat = client.post("/registre/verificacio/confirmacio", json={"token": token})
    assert confirmat.status_code == 200
    assert confirmat.json()["detall"] == DETALL_VERIFICAT
    assert "token" not in confirmat.json()
    sessio = client.post("/sessio", json={"email": "Anna@example.com", "password": "secret123"})
    assert sessio.status_code == 200
    assert sessio.json()["role"] == "responsible"
    assert sessio.json()["entity_name"] == "AAVV Barri A"
    repetit = client.post("/registre/verificacio/confirmacio", json={"token": token})
    assert repetit.status_code == 410
    assert repetit.json()["detail"] == DETALL_ENLLAC
    inventat = client.post("/registre/verificacio/confirmacio", json={"token": "inventat"})
    assert inventat.status_code == 410
    assert inventat.json()["detail"] == DETALL_ENLLAC


def test_el_reenviament_respon_igual_i_un_correu_caigut_es_pot_tornar_a_demanar(
    sqlite_session_factory,
) -> None:
    mailer = CapturingMailer(fail=True)
    client = _client(sqlite_session_factory, mailer)
    alta = client.post("/registre", json=_payload())
    assert alta.status_code == 201
    assert alta.json()["lliurament"] == "failed"
    assert mailer.messages == []
    mailer.fail = False
    pendent = client.post("/registre/verificacio", json={"email": "anna@example.com"})
    absent = client.post("/registre/verificacio", json={"email": "ningu@example.com"})
    assert pendent.status_code == 200
    assert absent.status_code == 200
    assert pendent.json() == absent.json()
    assert pendent.json()["detall"] == DETALL_REENVIAMENT
    assert len(mailer.messages) == 1
    confirmat = client.post(
        "/registre/verificacio/confirmacio",
        json={"token": mailer.messages[0].token},
    )
    assert confirmat.status_code == 200
    ja_actiu = client.post("/registre/verificacio", json={"email": "anna@example.com"})
    assert ja_actiu.json() == pendent.json()
    assert len(mailer.messages) == 1


def test_la_recuperacio_i_la_invitacio_segueixen_despres_de_verificar(sqlite_session_factory) -> None:
    mailer, reset = CapturingMailer(), ResetMailer()
    client = _client(sqlite_session_factory, mailer, reset)
    assert client.post("/registre", json=_payload()).status_code == 201
    client.post(
        "/registre/verificacio/confirmacio",
        json={"token": mailer.messages[0].token},
    )
    recuperacio = client.post("/recuperacio", json={"email": "anna@example.com"})
    assert recuperacio.status_code == 200
    canviat = client.post(
        "/recuperacio/confirmacio",
        json={"token": reset.messages[0].token, "password": "nova-clau"},
    )
    assert canviat.status_code == 200
    antiga = client.post("/sessio", json={"email": "anna@example.com", "password": "secret123"})
    assert antiga.status_code == 401
    nova = client.post("/sessio", json={"email": "anna@example.com", "password": "nova-clau"})
    assert nova.status_code == 200
    invited = client.post(
        "/invitacions",
        headers={"Authorization": f"Bearer {nova.json()['token']}"},
        json={"email": "carla@example.com"},
    )
    assert invited.status_code == 201
    acceptat = client.post(
        f"/invitacions/{invited.json()['accept_url'].rsplit('/', 1)[-1]}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    assert acceptat.status_code == 201
    assert acceptat.json()["role"] == "coordinator"
    coordinador = client.get(
        "/sessio",
        headers={"Authorization": f"Bearer {acceptat.json()['token']}"},
    )
    assert coordinador.status_code == 200
    duplicat = client.post(
        "/registre",
        json=_payload(email="carla@example.com", entity_name="Altra", responsible_name="Carla"),
    )
    assert duplicat.status_code == 400
    assert "registrat" not in duplicat.json()["detail"]
