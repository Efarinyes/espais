"""Subscripcions Web Push i enviament: ni l’error del servei ni una subscripció morta trenquen res."""

import logging
from concurrent.futures import Executor, Future
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest

from app.adapters.memory.identity import FixedClock, SequentialIdGenerator
from app.adapters.memory.notifier import FailingNotifier, InMemoryNotifier
from app.adapters.memory.push import (
    DownPushGateway,
    InMemoryPushUnitOfWork,
    RecordingPushGateway,
)
from app.adapters.notifier_channels import (
    BackgroundNotifier,
    ChannelNotifier,
    PushNotifier,
)
from app.adapters.sqlalchemy.models import EntityRow, MembershipRow, UserRow
from app.adapters.sqlalchemy.push import SqlAlchemyPushUnitOfWork
from app.domain.errors import ForbiddenError, InvalidPushSubscriptionError
from app.domain.identity import MembershipRole
from app.domain.notification import Notification, NotificationPayload, NotificationType
from app.domain.push import MAX_SUBSCRIPTIONS_PER_USER, PushSubscription
from app.usecases.deliver_push_notification import DeliverPushNotification
from app.usecases.register_push_subscription import (
    RegisterPushSubscription,
    RegisterPushSubscriptionCommand,
)
from app.usecases.unregister_push_subscription import (
    UnregisterPushSubscription,
    UnregisterPushSubscriptionCommand,
)

ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)
COORDINATOR = UUID(int=100)
OTHER = UUID(int=101)
ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc-secret-endpoint"
OTHER_ENDPOINT = "https://updates.push.services.mozilla.com/wpush/v2/xyz-secret-endpoint"


def _register_command(**overrides: object) -> RegisterPushSubscriptionCommand:
    data: dict[str, object] = {
        "entity_id": ENTITY_A,
        "actor_user_id": COORDINATOR,
        "actor_role": MembershipRole.COORDINATOR,
        "endpoint": ENDPOINT,
        "p256dh": "clau-p256dh-secreta",
        "auth": "clau-auth-secreta",
    }
    data.update(overrides)
    return RegisterPushSubscriptionCommand(**data)  # type: ignore[arg-type]


_IDS = SequentialIdGenerator()


def _register(uow: InMemoryPushUnitOfWork) -> RegisterPushSubscription:
    return RegisterPushSubscription(uow, FixedClock(), _IDS)


def _notification(**overrides: object) -> Notification:
    data: dict[str, object] = {
        "id": UUID(int=900),
        "entity_id": ENTITY_A,
        "user_id": COORDINATOR,
        "reservation_id": UUID(int=5),
        "type": NotificationType.RESERVATION_RESCHEDULED,
        "payload": NotificationPayload(
            entity_name="AAVV Barri A",
            space_name="Sala 1",
            starts_at="2026-09-08T08:00:00+00:00",
            ends_at="2026-09-08T09:00:00+00:00",
            responsible_name="Anna",
            new_starts_at="2026-09-09T16:00:00+00:00",
            new_ends_at="2026-09-09T17:00:00+00:00",
            changes=("date", "start_time", "end_time"),
        ),
        "created_at": datetime(2026, 9, 8, 12, tzinfo=UTC),
    }
    data.update(overrides)
    return Notification(**data)  # type: ignore[arg-type]


def test_el_coordinador_registra_la_subscripcio_del_seu_navegador() -> None:
    uow = InMemoryPushUnitOfWork()
    _register(uow).execute(_register_command())

    stored = uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR)
    assert [item.endpoint for item in stored] == [ENDPOINT]
    assert uow._committed == stored


def test_registrar_dues_vegades_el_mateix_endpoint_no_el_duplica() -> None:
    uow = InMemoryPushUnitOfWork()
    _register(uow).execute(_register_command(p256dh="vella"))
    _register(uow).execute(_register_command(p256dh="nova"))

    stored = uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR)
    assert len(stored) == 1
    assert stored[0].p256dh == "nova"


def test_un_navegador_compartit_passa_a_la_darrera_persona_que_hi_inicia_sessio() -> None:
    uow = InMemoryPushUnitOfWork()
    _register(uow).execute(_register_command())
    _register(uow).execute(_register_command(actor_user_id=OTHER))

    assert uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR) == []
    assert len(uow.subscriptions.list_for_user(ENTITY_A, OTHER)) == 1


def test_el_responsable_no_registra_subscripcions() -> None:
    uow = InMemoryPushUnitOfWork()
    with pytest.raises(ForbiddenError):
        _register(uow).execute(_register_command(actor_role=MembershipRole.RESPONSIBLE))
    assert uow._working == []


@pytest.mark.parametrize(
    "endpoint",
    [
        "",
        "http://fcm.googleapis.com/fcm/send/x",
        "https://localhost/x",
        "https://127.0.0.1/x",
        "https://[::1]/x",
        "https://10.0.0.5/x",
        "https://interna.example.com/x",
        "https://fcm.googleapis.com.atacant.example/x",
        "https://usuari:clau@fcm.googleapis.com/x",
        "javascript:alert(1)",
        "https://fcm.googleapis.com/" + "a" * 2100,
    ],
)
def test_un_endpoint_que_no_es_d_un_servei_de_push_es_rebutja(endpoint: str) -> None:
    uow = InMemoryPushUnitOfWork()
    with pytest.raises(InvalidPushSubscriptionError):
        _register(uow).execute(_register_command(endpoint=endpoint))
    assert uow._working == []


def test_unes_claus_buides_es_rebutgen() -> None:
    uow = InMemoryPushUnitOfWork()
    with pytest.raises(InvalidPushSubscriptionError):
        _register(uow).execute(_register_command(auth=""))
    with pytest.raises(InvalidPushSubscriptionError):
        _register(uow).execute(_register_command(p256dh=""))


def test_un_usuari_no_acumula_mes_subscripcions_que_el_maxim() -> None:
    uow = InMemoryPushUnitOfWork()
    clock_ids = _IDS
    for index in range(MAX_SUBSCRIPTIONS_PER_USER + 3):
        RegisterPushSubscription(
            uow, FixedClock(datetime(2026, 9, 8, 12, index, tzinfo=UTC)), clock_ids
        ).execute(_register_command(endpoint=f"https://fcm.googleapis.com/fcm/send/{index}"))

    stored = uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR)
    assert len(stored) == MAX_SUBSCRIPTIONS_PER_USER
    assert stored[0].endpoint.endswith("/3")
    assert stored[-1].endpoint.endswith(f"/{MAX_SUBSCRIPTIONS_PER_USER + 2}")


def test_donar_de_baixa_elimina_nomes_la_subscripcio_propia() -> None:
    uow = InMemoryPushUnitOfWork()
    _register(uow).execute(_register_command())
    _register(uow).execute(_register_command(actor_user_id=OTHER, endpoint=OTHER_ENDPOINT))

    UnregisterPushSubscription(uow).execute(
        UnregisterPushSubscriptionCommand(
            entity_id=ENTITY_A,
            actor_user_id=COORDINATOR,
            actor_role=MembershipRole.COORDINATOR,
            endpoint=OTHER_ENDPOINT,
        )
    )
    assert len(uow.subscriptions.list_for_user(ENTITY_A, OTHER)) == 1

    UnregisterPushSubscription(uow).execute(
        UnregisterPushSubscriptionCommand(
            entity_id=ENTITY_A,
            actor_user_id=COORDINATOR,
            actor_role=MembershipRole.COORDINATOR,
            endpoint=ENDPOINT,
        )
    )
    assert uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR) == []
    UnregisterPushSubscription(uow).execute(
        UnregisterPushSubscriptionCommand(
            entity_id=ENTITY_A,
            actor_user_id=COORDINATOR,
            actor_role=MembershipRole.COORDINATOR,
            endpoint=ENDPOINT,
        )
    )


def test_l_enviament_porta_el_text_de_la_modificacio_a_cada_subscripcio_del_coordinador() -> None:
    uow = InMemoryPushUnitOfWork()
    _register(uow).execute(_register_command())
    _register(uow).execute(_register_command(endpoint=OTHER_ENDPOINT))
    _register(uow).execute(_register_command(actor_user_id=OTHER, endpoint="https://fcm.googleapis.com/x"))
    gateway = RecordingPushGateway()

    result = DeliverPushNotification(uow, gateway).execute(_notification())

    assert result.accepted == 2
    assert {item.endpoint for item, _ in gateway.sent} == {ENDPOINT, OTHER_ENDPOINT}
    message = gateway.sent[0][1]
    assert message.title == "Reserva modificada: Sala 1"
    assert "dimarts 8 de setembre, 10:00–11:00" in message.body
    assert "dimecres 9 de setembre, 18:00–19:00" in message.body
    assert "el dia, l’hora d’inici i l’hora de fi" in message.body
    assert message.url == "/avisos?avis=" + str(UUID(int=900))
    assert message.tag == "avis-" + str(UUID(int=900))


def test_l_enviament_d_una_anul_lacio_diu_l_horari_original() -> None:
    uow = InMemoryPushUnitOfWork()
    _register(uow).execute(_register_command())
    gateway = RecordingPushGateway()
    anul_lada = _notification(
        type=NotificationType.RESERVATION_CANCELLED,
        payload=NotificationPayload(
            entity_name="AAVV Barri A",
            space_name="Sala 1",
            starts_at="2026-04-08T08:00:00+00:00",
            ends_at="2026-04-08T09:30:00+00:00",
            responsible_name="Anna",
            reason="acte de l’ajuntament",
        ),
    )

    DeliverPushNotification(uow, gateway).execute(anul_lada)

    message = gateway.sent[0][1]
    assert message.title == "Reserva anul·lada: Sala 1"
    assert "Horari original: dimecres 8 d’abril, 10:00–11:30." in message.body
    assert "anul·lada" in message.body
    assert "Motiu: acte de l’ajuntament." in message.body


def test_una_subscripcio_caducada_s_elimina_i_la_resta_rep_l_avis() -> None:
    uow = InMemoryPushUnitOfWork()
    _register(uow).execute(_register_command())
    _register(uow).execute(_register_command(endpoint=OTHER_ENDPOINT))
    gateway = RecordingPushGateway(expired={ENDPOINT})

    result = DeliverPushNotification(uow, gateway).execute(_notification())

    assert (result.accepted, result.removed, result.failed) == (1, 1, 0)
    assert [item.endpoint for item in uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR)] == [
        OTHER_ENDPOINT
    ]
    assert uow._committed == uow._working


def test_una_fallada_temporal_del_servei_no_elimina_la_subscripcio(caplog: pytest.LogCaptureFixture) -> None:
    uow = InMemoryPushUnitOfWork()
    _register(uow).execute(_register_command())
    gateway = RecordingPushGateway(failing={ENDPOINT})

    with caplog.at_level(logging.INFO):
        result = DeliverPushNotification(uow, gateway).execute(_notification())

    assert (result.accepted, result.removed, result.failed) == (0, 0, 1)
    assert len(uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR)) == 1
    log = caplog.text
    assert "PushDeliveryError" in log
    for secret in (ENDPOINT, "secret-endpoint", "clau-p256dh-secreta", "clau-auth-secreta"):
        assert secret not in log


def test_sense_subscripcions_no_s_envia_res() -> None:
    uow = InMemoryPushUnitOfWork()
    gateway = RecordingPushGateway()
    result = DeliverPushNotification(uow, gateway).execute(_notification())
    assert (result.accepted, result.removed, result.failed) == (0, 0, 0)
    assert gateway.sent == []


def test_l_enviament_no_modifica_l_avis_ni_el_marca_com_a_llegit() -> None:
    uow = InMemoryPushUnitOfWork()
    _register(uow).execute(_register_command())
    avis = _notification()

    DeliverPushNotification(uow, RecordingPushGateway()).execute(avis)

    assert avis.read_at is None


def test_el_canal_de_correu_i_el_de_push_no_es_tapen_entre_si() -> None:
    sent = InMemoryNotifier()
    notifier = ChannelNotifier([FailingNotifier(), sent])

    with pytest.raises(RuntimeError, match="smtp down"):
        notifier.send(_notification())

    assert len(sent.sent) == 1


class _Inline(Executor):
    def __init__(self) -> None:
        self.jobs: list[tuple[object, tuple[object, ...]]] = []

    def submit(self, fn, /, *args, **kwargs):  # type: ignore[no-untyped-def]
        self.jobs.append((fn, args))
        fn(*args, **kwargs)
        future: Future[None] = Future()
        future.set_result(None)
        return future


class _Broken(Executor):
    def submit(self, fn, /, *args, **kwargs):  # type: ignore[no-untyped-def]
        raise RuntimeError("cua plena")


def test_el_push_en_segon_pla_no_propaga_errors_al_cas_d_us() -> None:
    notifier = BackgroundNotifier(FailingNotifier(), _Inline())
    notifier.send(_notification())
    BackgroundNotifier(InMemoryNotifier(), _Broken()).send(_notification())


def test_el_push_en_segon_pla_envia_a_traves_del_notificador_intern() -> None:
    inner = InMemoryNotifier()
    executor = _Inline()
    BackgroundNotifier(inner, executor).send(_notification())
    assert len(inner.sent) == 1
    assert len(executor.jobs) == 1


def _sqlite_user(session_factory, *, entity_id: UUID, user_id: UUID, email: str) -> None:  # type: ignore[no-untyped-def]
    with session_factory() as session:
        if session.get(EntityRow, entity_id) is None:
            session.add(EntityRow(id=entity_id, name="Entitat", created_at=datetime.now(UTC)))
        session.flush()
        session.add(
            UserRow(
                id=user_id,
                name="Carla",
                email=email,
                password_hash="x",
                created_at=datetime.now(UTC),
            )
        )
        session.flush()
        session.add(
            MembershipRow(id=UUID(int=user_id.int + 1000), user_id=user_id, entity_id=entity_id, role="coordinator")
        )
        session.commit()


def test_sqlalchemy_desa_reassigna_i_aillat_per_entitat(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    _sqlite_user(sqlite_session_factory, entity_id=ENTITY_A, user_id=COORDINATOR, email="a@example.com")
    _sqlite_user(sqlite_session_factory, entity_id=ENTITY_A, user_id=OTHER, email="b@example.com")
    ids = _IDS
    clock = FixedClock()

    uow = SqlAlchemyPushUnitOfWork(sqlite_session_factory)
    try:
        RegisterPushSubscription(uow, clock, ids).execute(_register_command())
        RegisterPushSubscription(uow, clock, ids).execute(_register_command(p256dh="nova"))
    finally:
        uow.close()

    uow = SqlAlchemyPushUnitOfWork(sqlite_session_factory)
    try:
        mine = uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR)
        assert len(mine) == 1 and mine[0].p256dh == "nova"
        assert uow.subscriptions.list_for_user(ENTITY_B, COORDINATOR) == []
        assert uow.subscriptions.list_for_user(ENTITY_A, OTHER) == []
        RegisterPushSubscription(uow, clock, ids).execute(_register_command(actor_user_id=OTHER))
        assert uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR) == []
        assert len(uow.subscriptions.list_for_user(ENTITY_A, OTHER)) == 1
        assert uow.subscriptions.delete_for_user(ENTITY_A, COORDINATOR, ENDPOINT) is False
        assert uow.subscriptions.delete_for_user(ENTITY_A, OTHER, ENDPOINT) is True
        uow.commit()
    finally:
        uow.close()


def test_el_notificador_push_amb_sqlite_esborra_la_subscripcio_morta_i_no_llanca(  # type: ignore[no-untyped-def]
    sqlite_session_factory,
) -> None:
    _sqlite_user(sqlite_session_factory, entity_id=ENTITY_A, user_id=COORDINATOR, email="a@example.com")
    uow = SqlAlchemyPushUnitOfWork(sqlite_session_factory)
    try:
        for endpoint in (ENDPOINT, OTHER_ENDPOINT):
            RegisterPushSubscription(uow, FixedClock(), _IDS).execute(
                _register_command(endpoint=endpoint)
            )
    finally:
        uow.close()

    PushNotifier(sqlite_session_factory, RecordingPushGateway(expired={ENDPOINT})).send(_notification())

    uow = SqlAlchemyPushUnitOfWork(sqlite_session_factory)
    try:
        assert [item.endpoint for item in uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR)] == [
            OTHER_ENDPOINT
        ]
    finally:
        uow.close()

    PushNotifier(sqlite_session_factory, DownPushGateway()).send(_notification())
    uow = SqlAlchemyPushUnitOfWork(sqlite_session_factory)
    try:
        assert len(uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR)) == 1
    finally:
        uow.close()


def test_el_notificador_push_no_llanca_si_la_base_falla(caplog: pytest.LogCaptureFixture) -> None:
    class _Broken:
        def __call__(self):  # type: ignore[no-untyped-def]
            raise RuntimeError("base caiguda amb " + ENDPOINT)

    with caplog.at_level(logging.INFO):
        PushNotifier(_Broken(), RecordingPushGateway()).send(_notification())  # type: ignore[arg-type]

    assert "RuntimeError" in caplog.text
    assert ENDPOINT not in caplog.text


def test_una_subscripcio_es_desa_amb_la_data_del_rellotge() -> None:
    uow = InMemoryPushUnitOfWork()
    moment = datetime(2026, 9, 8, 12, tzinfo=UTC) + timedelta(minutes=5)
    RegisterPushSubscription(uow, FixedClock(moment), SequentialIdGenerator()).execute(_register_command())
    stored: PushSubscription = uow.subscriptions.list_for_user(ENTITY_A, COORDINATOR)[0]
    assert stored.created_at == moment
