"""Reserva modificada o anul·lada pel responsable (ADR 0026): avís, control i franja lliure."""

from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

import pytest

from app.adapters.attendance import CountAttendance
from app.adapters.memory.identity import FixedClock, SequentialIdGenerator
from app.adapters.memory.notifier import InMemoryNotifier
from app.adapters.memory.reservations import InMemoryReservationUnitOfWork
from app.domain.errors import (
    ForbiddenError,
    InvalidAttendanceError,
    InvalidCancellationError,
    InvalidReservationError,
)
from app.domain.identity import MembershipRole
from app.domain.notification import (
    CHANGE_DATE,
    CHANGE_END_TIME,
    CHANGE_START_TIME,
    NotificationType,
    reservation_changes,
)
from app.domain.reservation import ReservationStatus, as_utc
from app.domain.space import Space, default_week_windows
from app.usecases.cancel_own_reservation import (
    CancelOwnReservation,
    CancelOwnReservationCommand,
)
from app.usecases.cancel_reservation_by_responsible import (
    CancelReservationByResponsible,
    CancelReservationByResponsibleCommand,
)
from app.usecases.create_reservation import CreateReservation, CreateReservationCommand
from app.usecases.list_reservations import ListReservations, ListReservationsQuery
from app.usecases.list_sent_notifications import (
    ListSentNotifications,
    ListSentNotificationsQuery,
)
from app.usecases.mark_notification_read import (
    MarkNotificationRead,
    MarkNotificationReadCommand,
)
from app.usecases.record_attendance import RecordAttendance, RecordAttendanceCommand
from app.usecases.reschedule_reservation import (
    RescheduleReservation,
    RescheduleReservationCommand,
)

MADRID = ZoneInfo("Europe/Madrid")
ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)
COORDINATOR = UUID(int=100)
OTHER_COORDINATOR = UUID(int=101)
RESPONSIBLE = UUID(int=200)
SPACE_A = UUID(int=1)


def _slot(hour: int = 10, day: int = 8) -> tuple[datetime, datetime]:
    start = datetime(2026, 9, day, hour, 0, tzinfo=MADRID)
    return start, start + timedelta(minutes=60)


class _Env:
    def __init__(self) -> None:
        self.uow = InMemoryReservationUnitOfWork()
        self.uow.spaces.add(
            Space(
                id=SPACE_A,
                entity_id=ENTITY_A,
                name="Sala 1",
                capacity=40,
                equipment=None,
                min_attendance=None,
                active=True,
                created_at=datetime(2026, 9, 1, 12, tzinfo=MADRID),
                windows=default_week_windows(),
            )
        )
        self.uow.commit()
        self.ids = SequentialIdGenerator()
        self.clock = FixedClock()
        self.mail = InMemoryNotifier()

    def create(self, hour: int = 10, day: int = 8, actor: UUID = COORDINATOR):
        start, end = _slot(hour, day)
        return CreateReservation(self.uow, self.clock, self.ids).execute(
            CreateReservationCommand(
                entity_id=ENTITY_A,
                actor_user_id=actor,
                actor_role=MembershipRole.COORDINATOR,
                actor_name="Carla",
                space_id=SPACE_A,
                starts_at=start,
                ends_at=end,
            )
        ).reservation

    def reschedule(self, reservation_id: UUID, *, hour: int, day: int = 8, responsible: bool = True):
        start, end = _slot(hour, day)
        return RescheduleReservation(self.uow, self.mail, self.clock, self.ids).execute(
            RescheduleReservationCommand(
                entity_id=ENTITY_A,
                actor_user_id=RESPONSIBLE if responsible else COORDINATOR,
                actor_role=MembershipRole.RESPONSIBLE if responsible else MembershipRole.COORDINATOR,
                actor_name="Anna" if responsible else "Carla",
                entity_name="AAVV Barri A",
                reservation_id=reservation_id,
                starts_at=start,
                ends_at=end,
            )
        )

    def cancel(self, reservation_id: UUID):
        return CancelReservationByResponsible(self.uow, self.mail, self.clock, self.ids).execute(
            CancelReservationByResponsibleCommand(
                entity_id=ENTITY_A,
                actor_user_id=RESPONSIBLE,
                actor_role=MembershipRole.RESPONSIBLE,
                actor_name="Anna",
                entity_name="AAVV Barri A",
                reservation_id=reservation_id,
            )
        )

    def cancel_own(self, reservation_id: UUID):
        return CancelOwnReservation(self.uow).execute(
            CancelOwnReservationCommand(
                entity_id=ENTITY_A,
                actor_user_id=COORDINATOR,
                actor_role=MembershipRole.COORDINATOR,
                reservation_id=reservation_id,
            )
        )

    def stored(self, reservation_id: UUID):
        item = self.uow.reservations.get_by_id(ENTITY_A, reservation_id)
        assert item is not None
        return item


def test_els_canvis_es_deriven_de_l_interval_antic_i_el_nou() -> None:
    antic = _slot(10, 8)
    assert reservation_changes(*antic, *_slot(12, 8)) == (CHANGE_START_TIME, CHANGE_END_TIME)
    assert reservation_changes(*antic, *_slot(10, 9)) == (CHANGE_DATE,)
    assert reservation_changes(*antic, *_slot(12, 9)) == (
        CHANGE_DATE,
        CHANGE_START_TIME,
        CHANGE_END_TIME,
    )
    assert reservation_changes(*antic, *antic) == ()
    inici = antic[0]
    allargada = (inici, inici + timedelta(minutes=120))
    assert reservation_changes(*antic, *allargada) == (CHANGE_END_TIME,)


def test_el_responsable_modifica_i_la_reserva_queda_sota_el_seu_control() -> None:
    env = _Env()
    reserva = env.create()
    assert reserva.managed_by_responsible is False

    result = env.reschedule(reserva.id, hour=12)

    assert result.reservation.managed_by_responsible is True
    assert env.stored(reserva.id).managed_by_responsible is True
    assert result.notification is not None
    assert result.notification.type == NotificationType.RESERVATION_RESCHEDULED
    assert result.notification.user_id == COORDINATOR
    assert result.notification.payload.changes == (CHANGE_START_TIME, CHANGE_END_TIME)
    assert result.notification.payload.space_name == "Sala 1"
    assert result.notification.payload.space_id == str(SPACE_A)
    assert env.mail.sent == [result.notification]


def test_l_avis_de_modificacio_porta_espai_data_horari_antic_i_nou() -> None:
    env = _Env()
    reserva = env.create(hour=10, day=8)
    notification = env.reschedule(reserva.id, hour=18, day=9).notification
    assert notification is not None
    payload = notification.payload
    antic, antic_fi = _slot(10, 8)
    nou, nou_fi = _slot(18, 9)
    assert payload.starts_at == as_utc(antic).isoformat()
    assert payload.ends_at == as_utc(antic_fi).isoformat()
    assert payload.new_starts_at == as_utc(nou).isoformat()
    assert payload.new_ends_at == as_utc(nou_fi).isoformat()
    assert payload.changes == (CHANGE_DATE, CHANGE_START_TIME, CHANGE_END_TIME)


def test_el_coordinador_no_pot_tornar_a_reprogramar_una_reserva_modificada_pel_responsable() -> None:
    env = _Env()
    reserva = env.create()
    env.reschedule(reserva.id, hour=12)
    before = env.stored(reserva.id)

    with pytest.raises(ForbiddenError):
        env.reschedule(reserva.id, hour=15, responsible=False)

    assert env.stored(reserva.id) == before


def test_el_coordinador_no_pot_anul_lar_una_reserva_modificada_pel_responsable() -> None:
    env = _Env()
    reserva = env.create()
    env.reschedule(reserva.id, hour=12)

    with pytest.raises(ForbiddenError):
        env.cancel_own(reserva.id)

    assert env.stored(reserva.id).status == ReservationStatus.CONFIRMED


def test_el_coordinador_continua_registrant_l_assistencia_d_una_reserva_modificada() -> None:
    env = _Env()
    reserva = env.create()
    env.reschedule(reserva.id, hour=12)

    result = RecordAttendance(env.uow, CountAttendance(), env.clock, env.ids).execute(
        RecordAttendanceCommand(
            entity_id=ENTITY_A,
            actor_user_id=COORDINATOR,
            actor_role=MembershipRole.COORDINATOR,
            reservation_id=reserva.id,
            count=7,
        )
    )

    assert result.record.count == 7


def test_el_responsable_pot_tornar_a_modificar_i_cada_canvi_genera_el_seu_avis() -> None:
    env = _Env()
    reserva = env.create()
    first = env.reschedule(reserva.id, hour=12).notification
    second = env.reschedule(reserva.id, hour=15).notification

    assert first is not None and second is not None
    assert first.id != second.id
    assert len(env.uow.notifications.list_for_user(ENTITY_A, COORDINATOR)) == 2


def test_el_coordinador_que_reprograma_la_seva_reserva_no_genera_avis_ni_la_bloqueja() -> None:
    env = _Env()
    reserva = env.create()

    result = env.reschedule(reserva.id, hour=12, responsible=False)

    assert result.notification is None
    assert env.mail.sent == []
    assert env.uow.notifications.list_for_user(ENTITY_A, COORDINATOR) == []
    assert env.stored(reserva.id).managed_by_responsible is False
    env.reschedule(reserva.id, hour=14, responsible=False)


def test_una_reprogramacio_del_responsable_sense_canvi_no_genera_avis_duplicat() -> None:
    env = _Env()
    reserva = env.create(hour=10)

    result = env.reschedule(reserva.id, hour=10)

    assert result.notification is None
    assert env.mail.sent == []
    assert env.uow.notifications.list_for_user(ENTITY_A, COORDINATOR) == []
    assert env.stored(reserva.id).managed_by_responsible is False


def test_anul_lar_dues_vegades_no_duplica_l_avis() -> None:
    env = _Env()
    reserva = env.create()
    env.cancel(reserva.id)

    with pytest.raises(InvalidCancellationError):
        env.cancel(reserva.id)

    assert len(env.uow.notifications.list_for_user(ENTITY_A, COORDINATOR)) == 1


def test_l_avis_d_anul_lacio_porta_espai_data_i_horari_original() -> None:
    env = _Env()
    reserva = env.create(hour=10, day=8)

    result = env.cancel(reserva.id)

    start, end = _slot(10, 8)
    payload = result.notification.payload
    assert result.notification.type == NotificationType.RESERVATION_CANCELLED
    assert payload.space_name == "Sala 1"
    assert payload.starts_at == as_utc(start).isoformat()
    assert payload.ends_at == as_utc(end).isoformat()
    assert payload.new_starts_at is None
    assert payload.changes == ()


def test_la_reserva_anul_lada_continua_com_a_registre_historic() -> None:
    env = _Env()
    reserva = env.create()
    env.cancel(reserva.id)

    stored = env.stored(reserva.id)
    assert stored.status == ReservationStatus.CANCELLED
    assert stored.starts_at == reserva.starts_at
    assert stored.coordinator_id == COORDINATOR


def test_el_coordinador_no_pot_modificar_ni_restaurar_una_reserva_anul_lada() -> None:
    env = _Env()
    reserva = env.create()
    env.cancel(reserva.id)

    with pytest.raises(InvalidReservationError):
        env.reschedule(reserva.id, hour=10, responsible=False)
    with pytest.raises(InvalidReservationError):
        env.reschedule(reserva.id, hour=14, responsible=False)
    with pytest.raises(InvalidCancellationError):
        env.cancel_own(reserva.id)
    with pytest.raises(InvalidAttendanceError):
        RecordAttendance(env.uow, CountAttendance(), env.clock, env.ids).execute(
            RecordAttendanceCommand(
                entity_id=ENTITY_A,
                actor_user_id=COORDINATOR,
                actor_role=MembershipRole.COORDINATOR,
                reservation_id=reserva.id,
                count=3,
            )
        )

    assert env.stored(reserva.id).status == ReservationStatus.CANCELLED


def test_una_franja_alliberada_admet_una_reserva_nova_i_independent() -> None:
    env = _Env()
    original = env.create(hour=10)
    env.cancel(original.id)

    nova = env.create(hour=10, actor=OTHER_COORDINATOR)

    assert nova.id != original.id
    assert nova.status == ReservationStatus.CONFIRMED
    assert nova.managed_by_responsible is False
    assert nova.coordinator_id == OTHER_COORDINATOR
    assert env.stored(original.id).status == ReservationStatus.CANCELLED
    assert env.stored(original.id).coordinator_id == COORDINATOR


def test_el_mateix_coordinador_pot_crear_una_reserva_nova_a_la_franja_que_se_li_ha_anul_lat() -> None:
    env = _Env()
    original = env.create(hour=10)
    env.cancel(original.id)

    nova = env.create(hour=10)

    assert nova.id != original.id
    assert env.stored(original.id).status == ReservationStatus.CANCELLED


def test_una_reserva_anul_lada_no_bloqueja_una_reprogramacio_cap_a_la_seva_franja() -> None:
    env = _Env()
    anul_lada = env.create(hour=10)
    movible = env.create(hour=14)
    env.cancel(anul_lada.id)

    result = env.reschedule(movible.id, hour=10)

    assert result.reservation.starts_at == as_utc(_slot(10)[0])


def test_el_responsable_veu_si_l_avis_s_ha_llegit_i_el_coordinador_no_veu_aquest_estat() -> None:
    env = _Env()
    reserva = env.create()
    notification = env.reschedule(reserva.id, hour=12).notification
    assert notification is not None
    start, end = _slot(0)
    query = {
        "entity_id": ENTITY_A,
        "starts_at": start - timedelta(days=30),
        "ends_at": end + timedelta(days=30),
    }

    def as_responsible():
        return ListReservations(env.uow).execute(
            ListReservationsQuery(
                actor_user_id=RESPONSIBLE, actor_role=MembershipRole.RESPONSIBLE, **query
            )
        )

    def as_coordinator():
        return ListReservations(env.uow).execute(
            ListReservationsQuery(
                actor_user_id=COORDINATOR, actor_role=MembershipRole.COORDINATOR, **query
            )
        )

    pending = as_responsible()[0].notice
    assert pending is not None
    assert pending.notification_id == notification.id
    assert pending.read_at is None
    assert as_coordinator()[0].notice is None
    assert as_coordinator()[0].managed_by_responsible is True

    MarkNotificationRead(env.uow, env.clock).execute(
        MarkNotificationReadCommand(
            entity_id=ENTITY_A,
            actor_user_id=COORDINATOR,
            actor_role=MembershipRole.COORDINATOR,
            notification_id=notification.id,
        )
    )

    read = as_responsible()[0].notice
    assert read is not None
    assert read.read_at == env.clock.now()


def test_nomes_el_responsable_de_l_entitat_veu_els_avisos_enviats() -> None:
    env = _Env()
    cancelled = env.create(hour=10)
    env.cancel(cancelled.id)
    moved = env.create(hour=14)
    env.reschedule(moved.id, hour=16)

    items = ListSentNotifications(env.uow).execute(
        ListSentNotificationsQuery(entity_id=ENTITY_A, actor_role=MembershipRole.RESPONSIBLE)
    )

    assert {item.type for item in items} == {
        NotificationType.RESERVATION_CANCELLED,
        NotificationType.RESERVATION_RESCHEDULED,
    }
    assert {item.coordinator_name for item in items} == {"Carla"}
    assert all(item.read_at is None for item in items)
    by_type = {item.type: item for item in items}
    assert by_type[NotificationType.RESERVATION_CANCELLED].reservation_status == ReservationStatus.CANCELLED
    assert by_type[NotificationType.RESERVATION_RESCHEDULED].reservation_status == ReservationStatus.CONFIRMED

    with pytest.raises(ForbiddenError):
        ListSentNotifications(env.uow).execute(
            ListSentNotificationsQuery(entity_id=ENTITY_A, actor_role=MembershipRole.COORDINATOR)
        )
    assert (
        ListSentNotifications(env.uow).execute(
            ListSentNotificationsQuery(entity_id=ENTITY_B, actor_role=MembershipRole.RESPONSIBLE)
        )
        == []
    )
