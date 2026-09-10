from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

import pytest

from app.adapters.memory.identity import FixedClock, SequentialIdGenerator
from app.adapters.memory.notifier import FailingNotifier, InMemoryNotifier
from app.adapters.memory.reservations import InMemoryReservationUnitOfWork
from app.domain.errors import (
    ForbiddenError,
    InvalidCancellationError,
    NotificationNotFoundError,
    ReservationNotFoundError,
)
from app.domain.identity import MembershipRole
from app.domain.notification import NotificationType
from app.domain.reservation import ReservationStatus
from app.domain.space import Space, default_week_windows
from app.usecases.cancel_reservation_by_responsible import (
    CancelReservationByResponsible,
    CancelReservationByResponsibleCommand,
)
from app.usecases.create_reservation import CreateReservation, CreateReservationCommand
from app.usecases.list_notifications import ListNotifications, ListNotificationsQuery
from app.usecases.list_reservations import ListReservations, ListReservationsQuery
from app.usecases.mark_notification_read import MarkNotificationRead, MarkNotificationReadCommand

MADRID = ZoneInfo("Europe/Madrid")
ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)
USER_A = UUID(int=100)
USER_B = UUID(int=200)
SPACE_A = UUID(int=1)


def _space() -> Space:
    return Space(
        id=SPACE_A,
        entity_id=ENTITY_A,
        name="Sala 1",
        capacity=40,
        equipment=None,
        min_attendance=None,
        active=True,
        created_at=datetime(2026, 9, 8, 12, tzinfo=MADRID),
        windows=default_week_windows(),
    )


def _slot(hour: int = 10) -> tuple[datetime, datetime]:
    start = datetime(2026, 9, 8, hour, 0, tzinfo=MADRID)
    return start, start + timedelta(minutes=60)


def _create(uow: InMemoryReservationUnitOfWork, ids: SequentialIdGenerator, **overrides: object):
    start, end = _slot()
    data: dict[str, object] = {
        "entity_id": ENTITY_A,
        "actor_user_id": USER_A,
        "actor_role": MembershipRole.COORDINATOR,
        "actor_name": "Carla",
        "space_id": SPACE_A,
        "starts_at": start,
        "ends_at": end,
    }
    data.update(overrides)
    return CreateReservation(uow, FixedClock(), ids).execute(
        CreateReservationCommand(**data)  # type: ignore[arg-type]
    )


def _setup(
    notifier: InMemoryNotifier | FailingNotifier | None = None,
) -> tuple[CancelReservationByResponsible, InMemoryReservationUnitOfWork, InMemoryNotifier | FailingNotifier, UUID]:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(_space())
    uow.commit()
    ids = SequentialIdGenerator()
    created = _create(uow, ids)
    mail = notifier if notifier is not None else InMemoryNotifier()
    canceller = CancelReservationByResponsible(uow, mail, FixedClock(), ids)
    return canceller, uow, mail, created.reservation.id


def _command(reservation_id: UUID, **overrides: object) -> CancelReservationByResponsibleCommand:
    data: dict[str, object] = {
        "entity_id": ENTITY_A,
        "actor_user_id": USER_B,
        "actor_role": MembershipRole.RESPONSIBLE,
        "actor_name": "Anna",
        "entity_name": "AAVV Barri A",
        "reservation_id": reservation_id,
    }
    data.update(overrides)
    return CancelReservationByResponsibleCommand(**data)  # type: ignore[arg-type]


def test_responsible_cancels_and_notifies_coordinator() -> None:
    canceller, uow, mail, reservation_id = _setup()
    assert isinstance(mail, InMemoryNotifier)
    result = canceller.execute(_command(reservation_id, reason="  junta  "))
    assert result.reservation.status == ReservationStatus.CANCELLED
    stored = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert stored is not None
    assert stored.status == ReservationStatus.CANCELLED
    assert result.notification.type == NotificationType.RESERVATION_CANCELLED
    assert result.notification.user_id == USER_A
    assert result.notification.payload.space_name == "Sala 1"
    assert result.notification.payload.entity_name == "AAVV Barri A"
    assert result.notification.payload.responsible_name == "Anna"
    assert result.notification.payload.reason == "junta"
    assert len(mail.sent) == 1
    assert mail.sent[0].id == result.notification.id
    listed = ListReservations(uow).execute(
        ListReservationsQuery(
            entity_id=ENTITY_A,
            actor_user_id=USER_B,
            actor_role=MembershipRole.RESPONSIBLE,
            starts_at=_slot(8)[0],
            ends_at=_slot(20)[1],
        )
    )
    assert listed == []


def test_coordinator_cannot_cancel_with_this_use_case() -> None:
    canceller, uow, mail, reservation_id = _setup()
    assert isinstance(mail, InMemoryNotifier)
    with pytest.raises(ForbiddenError):
        canceller.execute(
            _command(
                reservation_id,
                actor_user_id=USER_A,
                actor_role=MembershipRole.COORDINATOR,
                actor_name="Carla",
            )
        )
    assert uow.reservations.get_by_id(ENTITY_A, reservation_id).status == ReservationStatus.CONFIRMED  # type: ignore[union-attr]
    assert mail.sent == []


def test_already_cancelled_is_rejected() -> None:
    canceller, _uow, _mail, reservation_id = _setup()
    canceller.execute(_command(reservation_id))
    with pytest.raises(InvalidCancellationError):
        canceller.execute(_command(reservation_id))


def test_missing_reservation_is_not_found() -> None:
    canceller, _uow, _mail, _reservation_id = _setup()
    with pytest.raises(ReservationNotFoundError):
        canceller.execute(_command(UUID(int=999)))


def test_other_entity_does_not_find_reservation() -> None:
    canceller, _uow, _mail, reservation_id = _setup()
    with pytest.raises(ReservationNotFoundError):
        canceller.execute(_command(reservation_id, entity_id=ENTITY_B))


def test_notifier_failure_does_not_rollback_cancel() -> None:
    canceller, uow, _mail, reservation_id = _setup(FailingNotifier())
    result = canceller.execute(_command(reservation_id))
    assert result.reservation.status == ReservationStatus.CANCELLED
    stored = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert stored is not None
    assert stored.status == ReservationStatus.CANCELLED
    avisos = uow.notifications.list_for_user(ENTITY_A, USER_A)
    assert len(avisos) == 1


def test_coordinator_lists_own_notifications() -> None:
    canceller, uow, _mail, reservation_id = _setup()
    canceller.execute(_command(reservation_id))
    items = ListNotifications(uow).execute(ListNotificationsQuery(entity_id=ENTITY_A, actor_user_id=USER_A))
    assert len(items) == 1
    assert items[0].space_name == "Sala 1"
    assert items[0].read_at is None
    empty = ListNotifications(uow).execute(ListNotificationsQuery(entity_id=ENTITY_A, actor_user_id=USER_B))
    assert empty == []
    other = ListNotifications(uow).execute(ListNotificationsQuery(entity_id=ENTITY_B, actor_user_id=USER_A))
    assert other == []


def test_coordinator_marks_notification_read() -> None:
    canceller, uow, _mail, reservation_id = _setup()
    cancelled = canceller.execute(_command(reservation_id))
    marker = MarkNotificationRead(uow, FixedClock())
    result = marker.execute(
        MarkNotificationReadCommand(
            entity_id=ENTITY_A,
            actor_user_id=USER_A,
            notification_id=cancelled.notification.id,
        )
    )
    assert result.notification.read_at is not None
    stored = uow.notifications.get_by_id(ENTITY_A, cancelled.notification.id)
    assert stored is not None
    assert stored.read_at is not None


def test_cannot_mark_someone_elses_notification() -> None:
    canceller, uow, _mail, reservation_id = _setup()
    cancelled = canceller.execute(_command(reservation_id))
    marker = MarkNotificationRead(uow, FixedClock())
    with pytest.raises(NotificationNotFoundError):
        marker.execute(
            MarkNotificationReadCommand(
                entity_id=ENTITY_A,
                actor_user_id=USER_B,
                notification_id=cancelled.notification.id,
            )
        )
    with pytest.raises(NotificationNotFoundError):
        marker.execute(
            MarkNotificationReadCommand(
                entity_id=ENTITY_B,
                actor_user_id=USER_A,
                notification_id=cancelled.notification.id,
            )
        )
