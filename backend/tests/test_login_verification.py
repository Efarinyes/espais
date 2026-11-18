"""Política del codi i orquestració del repte, sense HTTP."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.adapters.login_challenges import LoginChallengeStore
from app.adapters.login_socket import LoginHub, tanca_connexio
from app.adapters.memory.identity import (
    FixedClock,
    InMemoryIdentityUnitOfWork,
    PlainPasswordHasher,
    SequentialIdGenerator,
)
from app.domain.errors import (
    EmailNotVerifiedError,
    InvalidCredentialsError,
    InvalidLoginCodeError,
    LoginChallengeClosedError,
    LoginConnectionError,
    LoginRateLimitedError,
)
from app.domain.login_verification import (
    CODE_TTL,
    COOLDOWN,
    MAX_ATTEMPTS,
    MAX_PER_CHANNEL,
    MAX_PER_IP,
    LoginChallenge,
    apply_code,
    blind,
    rate_reason,
)
from app.usecases.begin_login_verification import (
    BeginLoginVerification,
    BeginLoginVerificationCommand,
)
from app.usecases.confirm_login_verification import (
    ConfirmLoginVerification,
    ConfirmLoginVerificationCommand,
)
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand
from tests.activar import activar_en_memoria


class CodiFix:
    def __init__(self, codi: str = "123456") -> None:
        self.codi = codi

    def new(self) -> str:
        return self.codi


class Rellotge:
    def __init__(self) -> None:
        self.moment = datetime(2026, 11, 18, 16, 0, tzinfo=UTC)

    def now(self) -> datetime:
        return self.moment


def _repte(**overrides: object) -> LoginChallenge:
    data: dict[str, object] = {
        "id": UUID(int=1),
        "user_id": UUID(int=2),
        "channel_hash": blind("canal-a"),
        "code_hash": blind("123456"),
        "expires_at": datetime(2026, 11, 18, 16, 2, tzinfo=UTC),
    }
    data.update(overrides)
    return LoginChallenge(**data)  # type: ignore[arg-type]


def test_el_codi_incorrecte_gasta_un_intent_i_el_cinque_tanca() -> None:
    ara = datetime(2026, 11, 18, 16, 0, tzinfo=UTC)
    row = _repte()
    assert apply_code(row, blind("canal-a"), blind("000000"), ara) == "invalid"
    assert row.attempts == 1
    assert row.closed_at is None
    for _ in range(MAX_ATTEMPTS - 2):
        apply_code(row, blind("canal-a"), blind("000000"), ara)
    assert apply_code(row, blind("canal-a"), blind("000000"), ara) == "locked"
    assert apply_code(row, blind("canal-a"), blind("123456"), ara) == "locked"


def test_un_altre_canal_no_gasta_intents_ni_accepta_el_codi() -> None:
    ara = datetime(2026, 11, 18, 16, 0, tzinfo=UTC)
    row = _repte()
    assert apply_code(row, blind("canal-b"), blind("123456"), ara) == "channel"
    assert row.attempts == 0
    assert row.closed_at is None
    assert apply_code(row, blind("canal-a"), blind("123456"), ara) is None
    assert apply_code(row, blind("canal-a"), blind("123456"), ara) == "reused"


def test_el_codi_caducat_no_es_pot_reutilitzar() -> None:
    row = _repte()
    ara = row.expires_at
    assert apply_code(row, blind("canal-a"), blind("123456"), ara) == "expired"
    assert apply_code(row, blind("canal-a"), blind("123456"), ara) == "expired"


def test_el_limit_es_per_canal_i_per_adreca() -> None:
    ara = datetime(2026, 11, 18, 16, 0, tzinfo=UTC)
    issues = [(ara, blind("canal-a"), blind("10.0.0.1"))]
    assert rate_reason(issues, ara + timedelta(seconds=1), blind("canal-a"), blind("10.0.0.1")) == "cooldown"
    assert rate_reason(issues, ara + COOLDOWN, blind("canal-a"), blind("10.0.0.2")) is None
    ple_canal = [(ara, blind("canal-a"), blind(f"10.0.0.{n}")) for n in range(MAX_PER_CHANNEL)]
    assert (
        rate_reason(ple_canal, ara + COOLDOWN, blind("canal-a"), blind("10.9.9.9")) == "channel"
    )
    ple_ip = [(ara, blind(f"canal-{n}"), blind("10.0.0.8")) for n in range(MAX_PER_IP)]
    assert rate_reason(ple_ip, ara + COOLDOWN, blind("canal-nou"), blind("10.0.0.8")) == "ip"
    assert rate_reason(ple_ip, ara + COOLDOWN, blind("canal-nou"), blind("10.0.0.9")) is None


def _prepara() -> tuple[InMemoryIdentityUnitOfWork, Rellotge, LoginChallengeStore, LoginHub, CodiFix]:
    uow = InMemoryIdentityUnitOfWork()
    RegisterEntity(uow, FixedClock(), SequentialIdGenerator(), PlainPasswordHasher()).execute(
        RegisterEntityCommand(
            entity_name="AAVV Barri A",
            typology="associació de veïns",
            responsible_name="Anna",
            email="anna@example.com",
            password="secret123",
        )
    )
    activar_en_memoria(uow, "anna@example.com")
    return uow, Rellotge(), LoginChallengeStore(), LoginHub(), CodiFix()


def _begin(uow, clock, store, hub, codes) -> BeginLoginVerification:  # type: ignore[no-untyped-def]
    return BeginLoginVerification(uow, PlainPasswordHasher(), clock, SequentialIdGenerator(), codes, store, hub)


def test_les_credencials_correctes_no_donen_sessio_i_el_codi_nomes_va_al_canal() -> None:
    uow, clock, store, hub, codes = _prepara()
    canal_a = hub.open()
    canal_b = hub.open()
    begin = _begin(uow, clock, store, hub, codes)
    obert = begin.execute(
        BeginLoginVerificationCommand(
            email="Anna@example.com", password="secret123", channel=canal_a, ip="10.0.0.1"
        )
    )
    assert hub.last_code(canal_a) == "123456"
    assert hub.last_code(canal_b) is None
    assert obert.expires_at - clock.now() == CODE_TTL
    vista = ConfirmLoginVerification(uow, clock, store, hub).execute(
        ConfirmLoginVerificationCommand(challenge_id=obert.challenge_id, code="123456", channel=canal_a)
    )
    assert vista.role.value == "responsible"
    assert vista.session_version == 0
    assert hub.last_code(canal_a) is None


def test_la_contrasenya_dolenta_i_el_correu_sense_verificar_no_obren_repte() -> None:
    uow = InMemoryIdentityUnitOfWork()
    RegisterEntity(uow, FixedClock(), SequentialIdGenerator(), PlainPasswordHasher()).execute(
        RegisterEntityCommand(
            entity_name="AAVV Barri A",
            typology=None,
            responsible_name="Anna",
            email="anna@example.com",
            password="secret123",
        )
    )
    clock, store, hub, codes = Rellotge(), LoginChallengeStore(), LoginHub(), CodiFix()
    begin = _begin(uow, clock, store, hub, codes)
    canal = hub.open()
    try:
        begin.execute(
            BeginLoginVerificationCommand(
                email="anna@example.com", password="no", channel=canal, ip="10.0.0.1"
            )
        )
        raise AssertionError("la contrasenya havia de fallar")
    except InvalidCredentialsError:
        pass
    try:
        begin.execute(
            BeginLoginVerificationCommand(
                email="anna@example.com", password="secret123", channel=canal, ip="10.0.0.1"
            )
        )
        raise AssertionError("el correu havia d’estar pendent")
    except EmailNotVerifiedError:
        pass
    assert hub.last_code(canal) is None


def test_sense_connexio_no_hi_ha_repte_i_un_codi_nou_invalid_a_lanterior() -> None:
    uow, clock, store, hub, codes = _prepara()
    begin = _begin(uow, clock, store, hub, codes)
    try:
        begin.execute(
            BeginLoginVerificationCommand(
                email="anna@example.com", password="secret123", channel="inventat", ip="10.0.0.1"
            )
        )
        raise AssertionError("havia de fallar")
    except LoginConnectionError:
        pass
    canal = hub.open()
    primer = begin.execute(
        BeginLoginVerificationCommand(
            email="anna@example.com", password="secret123", channel=canal, ip="10.0.0.1"
        )
    )
    try:
        begin.execute(
            BeginLoginVerificationCommand(
                email="anna@example.com", password="secret123", channel=canal, ip="10.0.0.1"
            )
        )
        raise AssertionError("havia de limitar")
    except LoginRateLimitedError as exc:
        assert exc.scope == "cooldown"
    clock.moment += COOLDOWN
    codes.codi = "654321"
    segon = begin.execute(
        BeginLoginVerificationCommand(
            email="anna@example.com", password="secret123", channel=canal, ip="10.0.0.1"
        )
    )
    confirm = ConfirmLoginVerification(uow, clock, store, hub)
    try:
        confirm.execute(
            ConfirmLoginVerificationCommand(challenge_id=primer.challenge_id, code="123456", channel=canal)
        )
        raise AssertionError("el codi vell havia de morir")
    except LoginChallengeClosedError as exc:
        assert exc.reason == "superseded"
    vista = confirm.execute(
        ConfirmLoginVerificationCommand(challenge_id=segon.challenge_id, code="654321", channel=canal)
    )
    assert vista.entity_name == "AAVV Barri A"


def test_el_codi_dolent_el_caducat_el_reusat_i_la_desconnexio() -> None:
    uow, clock, store, hub, codes = _prepara()
    canal = hub.open()
    begin = _begin(uow, clock, store, hub, codes)
    obert = begin.execute(
        BeginLoginVerificationCommand(
            email="anna@example.com", password="secret123", channel=canal, ip="10.0.0.1"
        )
    )
    confirm = ConfirmLoginVerification(uow, clock, store, hub)
    for _ in range(MAX_ATTEMPTS - 1):
        try:
            confirm.execute(
                ConfirmLoginVerificationCommand(
                    challenge_id=obert.challenge_id, code="000000", channel=canal
                )
            )
            raise AssertionError("el codi havia de fallar")
        except InvalidLoginCodeError:
            pass
    try:
        confirm.execute(
            ConfirmLoginVerificationCommand(challenge_id=obert.challenge_id, code="000000", channel=canal)
        )
        raise AssertionError("l’últim intent dolent havia de tancar")
    except LoginChallengeClosedError as exc:
        assert exc.reason == "locked"
    try:
        confirm.execute(
            ConfirmLoginVerificationCommand(challenge_id=obert.challenge_id, code="123456", channel=canal)
        )
        raise AssertionError("el codi bo ja no serveix")
    except LoginChallengeClosedError as exc:
        assert exc.reason == "locked"

    canal = hub.open()
    obert = begin.execute(
        BeginLoginVerificationCommand(
            email="anna@example.com", password="secret123", channel=canal, ip="10.0.0.2"
        )
    )
    clock.moment += CODE_TTL
    try:
        confirm.execute(
            ConfirmLoginVerificationCommand(challenge_id=obert.challenge_id, code="123456", channel=canal)
        )
        raise AssertionError("havia de caducar")
    except LoginChallengeClosedError as exc:
        assert exc.reason == "expired"

    clock.moment += COOLDOWN
    canal = hub.open()
    obert = begin.execute(
        BeginLoginVerificationCommand(
            email="anna@example.com", password="secret123", channel=canal, ip="10.0.0.3"
        )
    )
    confirm.execute(
        ConfirmLoginVerificationCommand(challenge_id=obert.challenge_id, code="123456", channel=canal)
    )
    try:
        confirm.execute(
            ConfirmLoginVerificationCommand(challenge_id=obert.challenge_id, code="123456", channel=canal)
        )
        raise AssertionError("no es pot reutilitzar")
    except LoginChallengeClosedError as exc:
        assert exc.reason == "reused"

    clock.moment += COOLDOWN
    canal = hub.open()
    obert = begin.execute(
        BeginLoginVerificationCommand(
            email="anna@example.com", password="secret123", channel=canal, ip="10.0.0.4"
        )
    )
    altre = hub.open()
    try:
        confirm.execute(
            ConfirmLoginVerificationCommand(challenge_id=obert.challenge_id, code="123456", channel=altre)
        )
        raise AssertionError("l’altre canal no valida")
    except LoginChallengeClosedError as exc:
        assert exc.reason == "channel"
    sid = hub.sid_for(canal)
    assert sid is not None
    tanca_connexio(hub, store, sid, clock.now())
    try:
        confirm.execute(
            ConfirmLoginVerificationCommand(challenge_id=obert.challenge_id, code="123456", channel=canal)
        )
        raise AssertionError("la connexió tancada no valida")
    except LoginChallengeClosedError as exc:
        assert exc.reason == "disconnected"
