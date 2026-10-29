"""Recuperació de compte: token d’un sol ús, límits i sessions anteriors."""

from datetime import timedelta

import pytest

from app.adapters.memory.identity import (
    FixedClock,
    InMemoryIdentityUnitOfWork,
    PlainPasswordHasher,
    SequentialIdGenerator,
)
from app.adapters.tokens import HmacTokenIssuer
from app.domain.errors import InvalidCredentialsError, InvalidPasswordResetError
from app.domain.identity import Membership, MembershipRole, User
from app.ports.password_reset_mail import PasswordResetMessage
from app.usecases.authenticate_user import AuthenticateUser, AuthenticateUserCommand
from app.usecases.confirm_password_reset import ConfirmPasswordReset, ConfirmPasswordResetCommand
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand
from app.usecases.request_password_reset import RequestPasswordReset, RequestPasswordResetCommand


class CapturingMailer:
    def __init__(self, *, fail: bool = False, configured: bool = True) -> None:
        self.messages: list[PasswordResetMessage] = []
        self.fail = fail
        self._configured = configured

    def configured(self) -> bool:
        return self._configured

    def send(self, message: PasswordResetMessage) -> None:
        if self.fail:
            raise RuntimeError("smtp caigut")
        self.messages.append(message)


class SeqTokens:
    def __init__(self) -> None:
        self._n = 0

    def new(self) -> str:
        self._n += 1
        return f"token-{self._n}"


def _registre(uow: InMemoryIdentityUnitOfWork, ids: SequentialIdGenerator) -> None:
    RegisterEntity(uow, FixedClock(), ids, PlainPasswordHasher()).execute(
        RegisterEntityCommand(
            entity_name="AAVV Barri A",
            typology="associació de veïns",
            responsible_name="Anna",
            email="anna@example.com",
            password="secret123",
        )
    )


def _demanar(
    uow: InMemoryIdentityUnitOfWork,
    clock: FixedClock,
    ids: SequentialIdGenerator,
    mailer: CapturingMailer,
    tokens: SeqTokens,
    *,
    email: str = "anna@example.com",
    ip: str = "203.0.113.8",
) -> None:
    RequestPasswordReset(uow, clock, ids, tokens, mailer).execute(
        RequestPasswordResetCommand(email=email, ip=ip)
    )


def test_compte_existent_envia_un_sol_correu_i_el_desconegut_no() -> None:
    uow = InMemoryIdentityUnitOfWork()
    clock = FixedClock()
    ids = SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    tokens = SeqTokens()
    _demanar(uow, clock, ids, mailer, tokens)
    _demanar(uow, clock, ids, mailer, tokens, email="ningú@example.com")
    assert len(mailer.messages) == 1
    assert mailer.messages[0].to_email == "anna@example.com"
    assert mailer.messages[0].token == "token-1"


def test_el_token_en_clar_no_es_guarda_i_nomes_serveix_una_vegada() -> None:
    uow = InMemoryIdentityUnitOfWork()
    clock = FixedClock()
    ids = SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    _demanar(uow, clock, ids, mailer, SeqTokens())
    raw = mailer.messages[0].token
    assert all(reset.token_hash != raw for reset in uow._committed.password_resets)
    ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
        ConfirmPasswordResetCommand(token=raw, password="nova-clau")
    )
    with pytest.raises(InvalidPasswordResetError):
        ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
            ConfirmPasswordResetCommand(token=raw, password="altra-clau")
        )
    AuthenticateUser(uow, PlainPasswordHasher()).execute(
        AuthenticateUserCommand(email="anna@example.com", password="nova-clau")
    )
    with pytest.raises(InvalidCredentialsError):
        AuthenticateUser(uow, PlainPasswordHasher()).execute(
            AuthenticateUserCommand(email="anna@example.com", password="secret123")
        )


def test_una_demanda_nova_invalida_l_enllac_anterior() -> None:
    uow = InMemoryIdentityUnitOfWork()
    clock = FixedClock()
    ids = SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    tokens = SeqTokens()
    _demanar(uow, clock, ids, mailer, tokens)
    primer = mailer.messages[0].token
    _demanar(uow, clock, ids, mailer, tokens)
    with pytest.raises(InvalidPasswordResetError):
        ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
            ConfirmPasswordResetCommand(token=primer, password="nova-clau")
        )
    ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
        ConfirmPasswordResetCommand(token=mailer.messages[1].token, password="nova-clau")
    )


def test_el_token_caduca_al_cap_d_una_hora() -> None:
    uow = InMemoryIdentityUnitOfWork()
    clock = FixedClock()
    ids = SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    _demanar(uow, clock, ids, mailer, SeqTokens())
    clock._moment = clock.now() + timedelta(hours=1)
    with pytest.raises(InvalidPasswordResetError):
        ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
            ConfirmPasswordResetCommand(token=mailer.messages[0].token, password="nova-clau")
        )


def test_si_el_correu_falla_no_queda_un_token_viu(caplog: pytest.LogCaptureFixture) -> None:
    uow = InMemoryIdentityUnitOfWork()
    clock = FixedClock()
    ids = SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer(fail=True)
    with caplog.at_level("ERROR"):
        _demanar(uow, clock, ids, mailer, SeqTokens())
    assert "token-1" not in caplog.text
    assert "secret123" not in caplog.text
    with pytest.raises(InvalidPasswordResetError):
        ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
            ConfirmPasswordResetCommand(token="token-1", password="nova-clau")
        )


def test_el_limit_per_compte_no_envia_el_quart_correu() -> None:
    uow = InMemoryIdentityUnitOfWork()
    clock = FixedClock()
    ids = SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    tokens = SeqTokens()
    for _ in range(4):
        _demanar(uow, clock, ids, mailer, tokens)
    assert len(mailer.messages) == 3


def test_el_limit_per_ip_també_aplica_a_comptes_inexistents() -> None:
    uow = InMemoryIdentityUnitOfWork()
    clock = FixedClock()
    ids = SequentialIdGenerator()
    mailer = CapturingMailer()
    tokens = SeqTokens()
    for index in range(11):
        _demanar(
            uow,
            clock,
            ids,
            mailer,
            tokens,
            email=f"ningú{index}@example.com",
            ip="198.51.100.9",
        )
    assert mailer.messages == []
    _registre(uow, ids)
    _demanar(uow, clock, ids, mailer, tokens, ip="198.51.100.9")
    assert mailer.messages == []


def test_el_coordinador_recupera_igual_i_la_sessio_anterior_mor() -> None:
    uow = InMemoryIdentityUnitOfWork()
    clock = FixedClock()
    ids = SequentialIdGenerator()
    _registre(uow, ids)
    responsable = uow.users.get_by_email("anna@example.com")
    assert responsable is not None
    membership = uow.memberships.get_by_user_id(responsable.id)
    assert membership is not None
    coordinador = User(
        id=ids.new(),
        name="Carla",
        email="carla@example.com",
        password_hash=PlainPasswordHasher().hash("secret123"),
        created_at=clock.now(),
    )
    uow.users.add(coordinador)
    uow.memberships.add(
        Membership(
            id=ids.new(),
            user_id=coordinador.id,
            entity_id=membership.entity_id,
            role=MembershipRole.COORDINATOR,
        )
    )
    uow.commit()
    mailer = CapturingMailer()
    _demanar(uow, clock, ids, mailer, SeqTokens(), email="carla@example.com")
    issuer = HmacTokenIssuer("secret-test", clock)
    antic = issuer.issue(coordinador.id, 0)
    view = ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
        ConfirmPasswordResetCommand(token=mailer.messages[0].token, password="nova-clau")
    )
    assert view.role == MembershipRole.COORDINATOR
    assert view.session_version == 1
    assert issuer.session_version(antic) == 0
    assert issuer.session_version(issuer.issue(view.user_id, view.session_version)) == 1


def test_sense_correu_configurat_no_queda_token_viu() -> None:
    uow = InMemoryIdentityUnitOfWork()
    clock = FixedClock()
    ids = SequentialIdGenerator()
    _registre(uow, ids)
    _demanar(uow, clock, ids, CapturingMailer(configured=False), SeqTokens())
    with pytest.raises(InvalidPasswordResetError):
        ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
            ConfirmPasswordResetCommand(token="token-1", password="nova-clau")
        )
