from datetime import datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

import pytest

from app.adapters.memory.identity import FixedClock, SequentialIdGenerator
from app.adapters.memory.notifier import FailingNotifier, InMemoryNotifier
from app.adapters.memory.reservations import InMemoryReservationUnitOfWork
from app.domain.errors import (
    ForbiddenError,
    InvalidReservationError,
    ReservationNotFoundError,
    ReservationOverlapError,
)
from app.domain.identity import MembershipRole
from app.domain.notification import NotificationType
from app.domain.reservation import ReservationStatus, as_utc
from app.domain.space import AvailabilityWindow, Space, default_week_windows
from app.usecases.create_reservation import CreateReservation, CreateReservationCommand
from app.usecases.list_reservations import ListReservations, ListReservationsQuery
from app.usecases.reschedule_reservation import RescheduleReservation, RescheduleReservationCommand

MADRID = ZoneInfo("Europe/Madrid")
ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)
USER_A = UUID(int=100)
USER_B = UUID(int=200)
SPACE_A = UUID(int=1)


def _space(*, windows=None) -> Space:
    return Space(
        id=SPACE_A,
        entity_id=ENTITY_A,
        name="Sala 1",
        capacity=40,
        equipment=None,
        min_attendance=None,
        active=True,
        created_at=datetime(2026, 9, 8, 12, tzinfo=MADRID),
        windows=windows if windows is not None else default_week_windows(),
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
    *,
    windows=None,
) -> tuple[RescheduleReservation, InMemoryReservationUnitOfWork, InMemoryNotifier | FailingNotifier, UUID]:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(_space(windows=windows))
    uow.commit()
    ids = SequentialIdGenerator()
    created = _create(uow, ids)
    mail = notifier if notifier is not None else InMemoryNotifier()
    mover = RescheduleReservation(uow, mail, FixedClock(), ids)
    return mover, uow, mail, created.reservation.id


def _command(reservation_id: UUID, **overrides: object) -> RescheduleReservationCommand:
    start, end = _slot(12)
    data: dict[str, object] = {
        "entity_id": ENTITY_A,
        "actor_user_id": USER_B,
        "actor_role": MembershipRole.RESPONSIBLE,
        "actor_name": "Anna",
        "entity_name": "AAVV Barri A",
        "reservation_id": reservation_id,
        "starts_at": start,
        "ends_at": end,
    }
    data.update(overrides)
    return RescheduleReservationCommand(**data)  # type: ignore[arg-type]


def test_responsible_reschedules_and_notifies() -> None:
    mover, uow, mail, reservation_id = _setup()
    assert isinstance(mail, InMemoryNotifier)
    old_start, old_end = _slot(10)
    new_start, new_end = _slot(12)
    result = mover.execute(_command(reservation_id, reason="  junta  "))
    assert result.reservation.status == ReservationStatus.CONFIRMED
    stored = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert stored is not None
    assert stored.starts_at == as_utc(new_start)
    assert stored.ends_at == as_utc(new_end)
    assert stored.status == ReservationStatus.CONFIRMED
    assert result.notification is not None
    assert result.notification.type == NotificationType.RESERVATION_RESCHEDULED
    assert result.notification.user_id == USER_A
    assert result.notification.payload.starts_at == as_utc(old_start).isoformat()
    assert result.notification.payload.ends_at == as_utc(old_end).isoformat()
    assert result.notification.payload.new_starts_at == as_utc(new_start).isoformat()
    assert result.notification.payload.new_ends_at == as_utc(new_end).isoformat()
    assert result.notification.payload.reason == "junta"
    assert len(mail.sent) == 1
    listed = ListReservations(uow).execute(
        ListReservationsQuery(
            entity_id=ENTITY_A,
            actor_user_id=USER_B,
            actor_role=MembershipRole.RESPONSIBLE,
            starts_at=_slot(8)[0],
            ends_at=_slot(20)[1],
        )
    )
    assert len(listed) == 1
    assert listed[0].starts_at == stored.starts_at


def test_coordinator_reschedules_own_without_notice() -> None:
    mover, uow, mail, reservation_id = _setup()
    assert isinstance(mail, InMemoryNotifier)
    new_start, new_end = _slot(12)
    result = mover.execute(
        _command(
            reservation_id,
            actor_user_id=USER_A,
            actor_role=MembershipRole.COORDINATOR,
            actor_name="Carla",
        )
    )
    assert result.notification is None
    assert mail.sent == []
    stored = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert stored is not None
    assert stored.starts_at == as_utc(new_start)
    assert stored.ends_at == as_utc(new_end)
    assert stored.status == ReservationStatus.CONFIRMED
    assert uow.notifications.list_for_user(ENTITY_A, USER_A) == []


def test_coordinator_cannot_reschedule_others() -> None:
    mover, uow, mail, reservation_id = _setup()
    assert isinstance(mail, InMemoryNotifier)
    with pytest.raises(ForbiddenError):
        mover.execute(
            _command(
                reservation_id,
                actor_user_id=UUID(int=300),
                actor_role=MembershipRole.COORDINATOR,
                actor_name="Oriol",
            )
        )
    stored = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert stored is not None
    assert stored.starts_at == as_utc(_slot(10)[0])
    assert mail.sent == []


def test_does_not_overlap_with_self() -> None:
    mover, _uow, _mail, reservation_id = _setup()
    start, end = _slot(10)
    result = mover.execute(_command(reservation_id, starts_at=start, ends_at=end + timedelta(minutes=30)))
    assert result.reservation.ends_at == (end + timedelta(minutes=30))


def test_overlap_with_other_reservation_is_rejected() -> None:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(_space())
    uow.commit()
    ids = SequentialIdGenerator()
    first = _create(uow, ids)
    _create(uow, ids, starts_at=_slot(12)[0], ends_at=_slot(12)[1])
    mover = RescheduleReservation(uow, InMemoryNotifier(), FixedClock(), ids)
    with pytest.raises(ReservationOverlapError):
        mover.execute(_command(first.reservation.id, starts_at=_slot(12)[0], ends_at=_slot(12)[1]))


def test_outside_windows_is_rejected() -> None:
    windows = (AvailabilityWindow(weekday=1, start=time(18, 0), end=time(22, 0)),)
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(_space(windows=windows))
    uow.commit()
    ids = SequentialIdGenerator()
    created = _create(uow, ids, starts_at=_slot(18)[0], ends_at=_slot(18)[1])
    mover = RescheduleReservation(uow, InMemoryNotifier(), FixedClock(), ids)
    with pytest.raises(InvalidReservationError):
        mover.execute(_command(created.reservation.id, starts_at=_slot(10)[0], ends_at=_slot(10)[1]))


def test_inverted_hours_rejected_before_missing_reservation() -> None:
    mover, _uow, _mail, _reservation_id = _setup()
    start, end = _slot(12)
    with pytest.raises(InvalidReservationError, match="anterior a la de fi"):
        mover.execute(_command(UUID(int=999), starts_at=end, ends_at=start))


def test_inverted_hours_rejected_before_cancelled() -> None:
    from dataclasses import replace

    mover, uow, _mail, reservation_id = _setup()
    stored = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert stored is not None
    uow.reservations.save(replace(stored, status=ReservationStatus.CANCELLED))
    uow.commit()
    start, end = _slot(12)
    with pytest.raises(InvalidReservationError, match="anterior a la de fi"):
        mover.execute(_command(reservation_id, starts_at=end, ends_at=start))
    kept = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert kept is not None
    assert kept.status == ReservationStatus.CANCELLED


def test_inverted_hours_rejected_before_forbidden() -> None:
    mover, uow, mail, reservation_id = _setup()
    assert isinstance(mail, InMemoryNotifier)
    start, end = _slot(12)
    with pytest.raises(InvalidReservationError, match="anterior a la de fi"):
        mover.execute(
            _command(
                reservation_id,
                actor_user_id=UUID(int=300),
                actor_role=MembershipRole.COORDINATOR,
                actor_name="Oriol",
                starts_at=end,
                ends_at=start,
            )
        )
    stored = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert stored is not None
    assert stored.starts_at == as_utc(_slot(10)[0])
    assert mail.sent == []


def test_cancelled_cannot_reschedule() -> None:
    from dataclasses import replace

    mover, uow, _mail, reservation_id = _setup()
    stored = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert stored is not None
    uow.reservations.save(replace(stored, status=ReservationStatus.CANCELLED))
    uow.commit()
    with pytest.raises(InvalidReservationError):
        mover.execute(_command(reservation_id))


def test_other_entity_does_not_find_reservation() -> None:
    mover, _uow, _mail, reservation_id = _setup()
    with pytest.raises(ReservationNotFoundError):
        mover.execute(_command(reservation_id, entity_id=ENTITY_B))


def test_notifier_failure_does_not_rollback_reschedule() -> None:
    mover, uow, _mail, reservation_id = _setup(FailingNotifier())
    result = mover.execute(_command(reservation_id))
    stored = uow.reservations.get_by_id(ENTITY_A, reservation_id)
    assert stored is not None
    assert stored.starts_at == result.reservation.starts_at
    assert len(uow.notifications.list_for_user(ENTITY_A, USER_A)) == 1
