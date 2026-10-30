"""Recuperació de compte: token d’un sol ús, límits i sessions anteriors. Cap sessió nova."""

from datetime import timedelta

import pytest

from app.adapters.memory.identity import (
    FixedClock,
    InMemoryIdentityUnitOfWork,
    PlainPasswordHasher,
    SequentialIdGenerator,
)
from app.adapters.tokens import HmacTokenIssuer
from app.domain.errors import (
    InvalidCredentialsError,
    InvalidPasswordResetError,
    InvalidRegistrationError,
)
from app.domain.identity import Membership, MembershipRole, User
from app.ports.password_reset_mail import PasswordResetMessage
from app.usecases.authenticate_user import AuthenticateUser, AuthenticateUserCommand
from app.usecases.confirm_password_reset import (
    ConfirmPasswordReset,
    ConfirmPasswordResetCommand,
)
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand
from app.usecases.request_password_reset import (
    RequestPasswordReset,
    RequestPasswordResetCommand,
    blind_hash,
)


class CapturingMailer:
    def __init__(self, *, fail: bool = False, configured: bool = True) -> None:
        self.messages: list[PasswordResetMessage] = []
        self.fail = fail
        self._configured = configured

    def configured(self) -> bool:
        return self._configured

    def send(self, message: PasswordResetMessage) -> None:
        if self.fail:
            raise RuntimeError(f"smtp caigut per a {message.to_email} amb {message.token}")
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


def _confirmar(uow: InMemoryIdentityUnitOfWork, clock: FixedClock, token: str, password: str = "nova-clau") -> None:
    ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
        ConfirmPasswordResetCommand(token=token, password=password)
    )


def _entra(uow: InMemoryIdentityUnitOfWork, password: str, email: str = "anna@example.com") -> MembershipRole:
    return AuthenticateUser(uow, PlainPasswordHasher()).execute(
        AuthenticateUserCommand(email=email, password=password)
    ).role


def test_compte_existent_envia_un_sol_correu_i_el_desconegut_no() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    tokens = SeqTokens()
    _demanar(uow, clock, ids, mailer, tokens)
    _demanar(uow, clock, ids, mailer, tokens, email="ningú@example.com")
    assert len(mailer.messages) == 1
    assert mailer.messages[0].to_email == "anna@example.com"
    assert len(uow._committed.password_resets) == 1


def test_l_email_es_normalitza_abans_de_buscar_el_compte() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    _demanar(uow, clock, ids, mailer, SeqTokens(), email="  Anna@Example.com ")
    assert [m.to_email for m in mailer.messages] == ["anna@example.com"]


def test_nomes_es_guarda_el_hash_i_caduca_al_cap_d_una_hora() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    _demanar(uow, clock, ids, mailer, SeqTokens())
    raw = mailer.messages[0].token
    [reset] = uow._committed.password_resets
    assert reset.token_hash == blind_hash(raw)
    assert reset.token_hash != raw
    assert reset.expires_at - reset.created_at == timedelta(hours=1)
    assert reset.used_at is None


def test_el_token_val_un_sol_cop_i_la_contrasenya_nova_substitueix_l_antiga() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    _demanar(uow, clock, ids, mailer, SeqTokens())
    raw = mailer.messages[0].token
    assert _confirmar(uow, clock, raw) is None
    with pytest.raises(InvalidPasswordResetError):
        _confirmar(uow, clock, raw, "altra-clau")
    assert _entra(uow, "nova-clau") == MembershipRole.RESPONSIBLE
    with pytest.raises(InvalidCredentialsError):
        _entra(uow, "secret123")
    with pytest.raises(InvalidCredentialsError):
        _entra(uow, "altra-clau")


def test_un_token_inventat_buit_o_alterat_no_serveix() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    _demanar(uow, clock, ids, mailer, SeqTokens())
    for token in ["", "   ", "inventat", mailer.messages[0].token + "x"]:
        with pytest.raises(InvalidPasswordResetError):
            _confirmar(uow, clock, token)
    _confirmar(uow, clock, mailer.messages[0].token)


def test_una_demanda_nova_invalida_l_enllac_anterior() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    tokens = SeqTokens()
    _demanar(uow, clock, ids, mailer, tokens)
    _demanar(uow, clock, ids, mailer, tokens)
    with pytest.raises(InvalidPasswordResetError):
        _confirmar(uow, clock, mailer.messages[0].token)
    _confirmar(uow, clock, mailer.messages[1].token)


def test_el_token_serveix_fins_a_l_hora_i_no_despres() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    tokens = SeqTokens()
    _demanar(uow, clock, ids, mailer, tokens)
    inici = clock.now()
    clock._moment = inici + timedelta(hours=1)
    with pytest.raises(InvalidPasswordResetError):
        _confirmar(uow, clock, mailer.messages[0].token)
    clock._moment = inici
    _demanar(uow, clock, ids, mailer, tokens)
    clock._moment = inici + timedelta(minutes=59)
    _confirmar(uow, clock, mailer.messages[1].token)


def test_una_contrasenya_invalida_no_consumeix_el_token() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    _demanar(uow, clock, ids, mailer, SeqTokens())
    raw = mailer.messages[0].token
    with pytest.raises(InvalidRegistrationError, match="massa curta"):
        _confirmar(uow, clock, raw, "curta")
    with pytest.raises(InvalidRegistrationError, match="massa llarga"):
        _confirmar(uow, clock, raw, "x" * 73)
    _confirmar(uow, clock, raw)
    assert _entra(uow, "nova-clau") == MembershipRole.RESPONSIBLE


def test_si_el_correu_falla_no_queda_token_viu_ni_dades_al_log(caplog: pytest.LogCaptureFixture) -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    with caplog.at_level("DEBUG"):
        _demanar(uow, clock, ids, CapturingMailer(fail=True), SeqTokens())
    assert "correu de recuperació" in caplog.text
    assert "token-1" not in caplog.text
    assert "anna@example.com" not in caplog.text
    assert "secret123" not in caplog.text
    with pytest.raises(InvalidPasswordResetError):
        _confirmar(uow, clock, "token-1")


def test_sense_correu_configurat_no_queda_token_viu() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    _demanar(uow, clock, ids, CapturingMailer(configured=False), SeqTokens())
    with pytest.raises(InvalidPasswordResetError):
        _confirmar(uow, clock, "token-1")


def test_el_limit_per_compte_talla_el_quart_correu_i_s_obre_passada_l_hora() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    _registre(uow, ids)
    mailer = CapturingMailer()
    tokens = SeqTokens()
    inici = clock.now()
    for minuts in range(4):
        clock._moment = inici + timedelta(minutes=minuts)
        _demanar(uow, clock, ids, mailer, tokens, ip=f"203.0.113.{minuts}")
    assert len(mailer.messages) == 3
    clock._moment = inici + timedelta(hours=1, minutes=4)
    _demanar(uow, clock, ids, mailer, tokens)
    assert len(mailer.messages) == 4


def test_el_limit_per_ip_tambe_compta_comptes_inexistents() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
    mailer = CapturingMailer()
    tokens = SeqTokens()
    for index in range(10):
        _demanar(uow, clock, ids, mailer, tokens, email=f"ningú{index}@example.com", ip="198.51.100.9")
    _registre(uow, ids)
    _demanar(uow, clock, ids, mailer, tokens, ip="198.51.100.9")
    assert mailer.messages == []
    _demanar(uow, clock, ids, mailer, tokens, ip="198.51.100.10")
    assert len(mailer.messages) == 1


def test_el_coordinador_recupera_igual_i_les_sessions_anteriors_cauen() -> None:
    uow, clock, ids = InMemoryIdentityUnitOfWork(), FixedClock(), SequentialIdGenerator()
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
        Membership(id=ids.new(), user_id=coordinador.id, entity_id=membership.entity_id, role=MembershipRole.COORDINATOR)
    )
    uow.commit()
    issuer = HmacTokenIssuer("secret-test", clock)
    antic = issuer.issue(coordinador.id, coordinador.session_version)

    mailer = CapturingMailer()
    _demanar(uow, clock, ids, mailer, SeqTokens(), email="carla@example.com")
    _confirmar(uow, clock, mailer.messages[0].token)

    actualitzat = uow.users.get_by_id(coordinador.id)
    assert actualitzat is not None
    assert actualitzat.session_version == 1
    assert issuer.session_version(antic) != actualitzat.session_version
    assert _entra(uow, "nova-clau", "carla@example.com") == MembershipRole.COORDINATOR
    assert uow.users.get_by_id(responsable.id).session_version == 0  # type: ignore[union-attr]
