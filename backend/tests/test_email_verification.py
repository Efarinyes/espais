"""Verificació del responsable: token d’un sol ús, activació conjunta i reenviament."""

from datetime import timedelta

import pytest

from app.adapters.memory.identity import (
    FixedClock,
    InMemoryIdentityUnitOfWork,
    PlainPasswordHasher,
    SequentialIdGenerator,
)
from app.domain.errors import (
    DuplicateEmailError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    InvalidEmailVerificationError,
)
from app.domain.identity import MembershipRole
from app.ports.email_verification_mail import EmailVerificationMessage
from app.ports.password_reset_mail import PasswordResetMessage
from app.usecases.accept_invitation import AcceptInvitation, AcceptInvitationCommand
from app.usecases.authenticate_user import AuthenticateUser, AuthenticateUserCommand
from app.usecases.confirm_email_verification import (
    ConfirmEmailVerification,
    ConfirmEmailVerificationCommand,
)
from app.usecases.confirm_password_reset import (
    ConfirmPasswordReset,
    ConfirmPasswordResetCommand,
)
from app.usecases.invite_coordinator import InviteCoordinator, InviteCoordinatorCommand
from app.usecases.issue_email_verification import (
    VERIFICATION_TTL,
    IssueEmailVerification,
    IssueEmailVerificationCommand,
)
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand
from app.usecases.request_email_verification import (
    RequestEmailVerification,
    RequestEmailVerificationCommand,
)
from app.usecases.request_password_reset import (
    RequestPasswordReset,
    RequestPasswordResetCommand,
    blind_hash,
)


class CapturingMailer:
    def __init__(self, *, fail: bool = False, configured: bool = True) -> None:
        self.messages: list[EmailVerificationMessage] = []
        self.fail = fail
        self._configured = configured

    def configured(self) -> bool:
        return self._configured

    def send(self, message: EmailVerificationMessage) -> None:
        if self.fail:
            raise RuntimeError(f"smtp caigut per a {message.to_email} amb {message.token}")
        self.messages.append(message)


class ResetMailer:
    def __init__(self) -> None:
        self.messages: list[PasswordResetMessage] = []

    def configured(self) -> bool:
        return True

    def send(self, message: PasswordResetMessage) -> None:
        self.messages.append(message)


class SeqTokens:
    def __init__(self) -> None:
        self._n = 0

    def new(self) -> str:
        self._n += 1
        return f"token-{self._n}"


def _alta(uow: InMemoryIdentityUnitOfWork, ids: SequentialIdGenerator):
    return RegisterEntity(uow, FixedClock(), ids, PlainPasswordHasher()).execute(
        RegisterEntityCommand(
            entity_name="AAVV Barri A",
            typology="associació de veïns",
            responsible_name="Anna",
            email="anna@example.com",
            password="secret123",
        )
    )


def _emet(uow, clock, ids, mailer, tokens):
    result = _alta(uow, ids)
    delivery = IssueEmailVerification(uow, clock, ids, tokens, mailer).execute(
        IssueEmailVerificationCommand(user_id=result.user_id)
    )
    return result, delivery


def _confirmar(uow, clock, token: str) -> None:
    ConfirmEmailVerification(uow, clock).execute(ConfirmEmailVerificationCommand(token=token))


def _entra(uow, password: str = "secret123", email: str = "anna@example.com"):
    return AuthenticateUser(uow, PlainPasswordHasher()).execute(
        AuthenticateUserCommand(email=email, password=password)
    )


def test_el_registre_deixa_el_compte_i_l_entitat_provisionals_i_envia_un_sol_enllac() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    mailer, tokens = CapturingMailer(), SeqTokens()
    result, delivery = _emet(uow, clock, ids, mailer, tokens)
    user = uow.users.get_by_id(result.user_id)
    entity = uow.entities.get_by_id(result.entity_id)
    assert user is not None and user.email_verified_at is None
    assert entity is not None and entity.activated_at is None
    assert delivery == "sent"
    assert len(mailer.messages) == 1
    assert mailer.messages[0].to_email == "anna@example.com"
    [verification] = uow._committed.email_verifications
    assert verification.token_hash == blind_hash(mailer.messages[0].token)
    assert verification.token_hash != mailer.messages[0].token
    assert verification.expires_at - verification.created_at == VERIFICATION_TTL
    assert verification.used_at is None
    with pytest.raises(EmailNotVerifiedError):
        _entra(uow)
    with pytest.raises(InvalidCredentialsError):
        _entra(uow, "equivocada")


def test_confirmar_activa_el_compte_i_l_entitat_i_el_token_no_es_reutilitza() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    mailer = CapturingMailer()
    _emet(uow, clock, ids, mailer, SeqTokens())
    raw = mailer.messages[0].token
    _confirmar(uow, clock, raw)
    user = uow.users.get_by_email("anna@example.com")
    entity = uow.entities.list_all()[0]
    assert user is not None and user.email_verified_at == clock.now()
    assert user.session_version == 0
    assert entity.activated_at == clock.now()
    assert _entra(uow).role == MembershipRole.RESPONSIBLE
    with pytest.raises(InvalidEmailVerificationError):
        _confirmar(uow, clock, raw)


def test_un_enllac_inventat_buit_caducat_o_substituït_no_serveix() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    mailer, tokens = CapturingMailer(), SeqTokens()
    _emet(uow, clock, ids, mailer, tokens)
    for token in ["", "   ", "inventat", mailer.messages[0].token + "x"]:
        with pytest.raises(InvalidEmailVerificationError):
            _confirmar(uow, clock, token)
    inici = clock.now()
    clock._moment = inici + timedelta(hours=24)
    with pytest.raises(InvalidEmailVerificationError):
        _confirmar(uow, clock, mailer.messages[0].token)
    clock._moment = inici
    IssueEmailVerification(uow, clock, ids, tokens, mailer).execute(
        IssueEmailVerificationCommand(user_id=uow.users.get_by_email("anna@example.com").id)  # type: ignore[union-attr]
    )
    with pytest.raises(InvalidEmailVerificationError):
        _confirmar(uow, clock, mailer.messages[0].token)
    _confirmar(uow, clock, mailer.messages[1].token)


def test_si_el_correu_no_surt_no_queda_token_viu_ni_dades_al_log(caplog: pytest.LogCaptureFixture) -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    with caplog.at_level("DEBUG"):
        _, delivery = _emet(uow, clock, ids, CapturingMailer(fail=True), SeqTokens())
    assert delivery == "failed"
    assert "token-1" not in caplog.text
    assert "anna@example.com" not in caplog.text
    assert "secret123" not in caplog.text
    with pytest.raises(InvalidEmailVerificationError):
        _confirmar(uow, clock, "token-1")
    _, sense = _emet(
        InMemoryIdentityUnitOfWork(),
        clock,
        SequentialIdGenerator(),
        CapturingMailer(configured=False),
        SeqTokens(),
    )
    assert sense == "unavailable"


def test_el_reenviament_no_revela_el_compte_i_te_limit() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    mailer, tokens = CapturingMailer(), SeqTokens()
    _emet(uow, clock, ids, mailer, tokens)
    demanar = RequestEmailVerification(uow, clock, ids, tokens, mailer)
    demanar.execute(RequestEmailVerificationCommand(email="ningú@example.com", ip="203.0.113.8"))
    assert len(mailer.messages) == 1
    for index in range(4):
        demanar.execute(RequestEmailVerificationCommand(email="Anna@example.com", ip=f"203.0.113.{index}"))
    assert len(mailer.messages) == 4
    with pytest.raises(InvalidEmailVerificationError):
        _confirmar(uow, clock, mailer.messages[0].token)
    _confirmar(uow, clock, mailer.messages[-1].token)
    abans = len(mailer.messages)
    demanar.execute(RequestEmailVerificationCommand(email="anna@example.com", ip="203.0.113.20"))
    assert len(mailer.messages) == abans


def test_la_recuperacio_no_verifica_el_correu() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    mailer, tokens = CapturingMailer(), SeqTokens()
    _emet(uow, clock, ids, mailer, tokens)
    reset = ResetMailer()
    RequestPasswordReset(uow, clock, ids, tokens, reset).execute(
        RequestPasswordResetCommand(email="anna@example.com", ip="198.51.100.9")
    )
    ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
        ConfirmPasswordResetCommand(token=reset.messages[0].token, password="nova-clau")
    )
    with pytest.raises(EmailNotVerifiedError):
        _entra(uow, "nova-clau")
    _confirmar(uow, clock, mailer.messages[0].token)
    assert _entra(uow, "nova-clau").role == MembershipRole.RESPONSIBLE


def test_el_coordinador_entra_per_invitacio_sense_el_registre() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    mailer = CapturingMailer()
    result, _ = _emet(uow, clock, ids, mailer, SeqTokens())
    _confirmar(uow, clock, mailer.messages[0].token)
    responsable = uow.memberships.get_by_user_id(result.user_id)
    assert responsable is not None
    InviteCoordinator(uow, clock, ids, SeqTokens()).execute(
        InviteCoordinatorCommand(
            entity_id=result.entity_id,
            actor_role=responsable.role,
            email="carla@example.com",
        )
    )
    AcceptInvitation(uow, clock, ids, PlainPasswordHasher()).execute(
        AcceptInvitationCommand(token="token-1", name="Carla", password="secret123")
    )
    coordinador = uow.users.get_by_email("carla@example.com")
    assert coordinador is not None and coordinador.email_verified_at == clock.now()
    assert _entra(uow, email="carla@example.com").role == MembershipRole.COORDINATOR
    with pytest.raises(DuplicateEmailError):
        RegisterEntity(uow, clock, ids, PlainPasswordHasher()).execute(
            RegisterEntityCommand(
                entity_name="Altra",
                typology=None,
                responsible_name="Carla",
                email="carla@example.com",
                password="secret123",
            )
        )
    assert len(uow.entities.list_all()) == 1
