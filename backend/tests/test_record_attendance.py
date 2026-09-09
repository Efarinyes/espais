from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

import pytest

from app.adapters.attendance import CountAttendance
from app.adapters.memory.identity import FixedClock, SequentialIdGenerator
from app.adapters.memory.reservations import InMemoryReservationUnitOfWork
from app.domain.errors import (
    ForbiddenError,
    InvalidAttendanceError,
    ReservationNotFoundError,
)
from app.domain.identity import MembershipRole
from app.domain.reservation import Reservation, ReservationStatus
from app.domain.space import Space, default_week_windows
from app.usecases.create_reservation import CreateReservation, CreateReservationCommand
from app.usecases.list_reservations import ListReservations, ListReservationsQuery
from app.usecases.record_attendance import RecordAttendance, RecordAttendanceCommand

MADRID = ZoneInfo("Europe/Madrid")
ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)
USER_A = UUID(int=100)
USER_B = UUID(int=200)
SPACE_A = UUID(int=1)


def _space(*, capacity: int = 40, min_attendance: int | None = None) -> Space:
    return Space(
        id=SPACE_A,
        entity_id=ENTITY_A,
        name="Sala 1",
        capacity=capacity,
        equipment=None,
        min_attendance=min_attendance,
        active=True,
        created_at=datetime(2026, 9, 8, 12, tzinfo=MADRID),
        windows=default_week_windows(),
    )


def _slot(hour: int = 10) -> tuple[datetime, datetime]:
    start = datetime(2026, 9, 8, hour, 0, tzinfo=MADRID)
    return start, start + timedelta(minutes=60)


def _create(uow: InMemoryReservationUnitOfWork, **overrides: object):
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
    return CreateReservation(uow, FixedClock(), SequentialIdGenerator()).execute(
        CreateReservationCommand(**data)  # type: ignore[arg-type]
    )


def _use_case(
    *,
    capacity: int = 40,
    min_attendance: int | None = None,
) -> tuple[RecordAttendance, InMemoryReservationUnitOfWork, UUID]:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(_space(capacity=capacity, min_attendance=min_attendance))
    uow.commit()
    created = _create(uow)
    recorder = RecordAttendance(uow, CountAttendance(), FixedClock(), SequentialIdGenerator())
    return recorder, uow, created.reservation.id


def _command(reservation_id: UUID, **overrides: object) -> RecordAttendanceCommand:
    data: dict[str, object] = {
        "entity_id": ENTITY_A,
        "actor_user_id": USER_A,
        "reservation_id": reservation_id,
        "count": 12,
    }
    data.update(overrides)
    return RecordAttendanceCommand(**data)  # type: ignore[arg-type]


def test_coordinator_records_count_on_own_reservation() -> None:
    recorder, uow, reservation_id = _use_case()
    result = recorder.execute(_command(reservation_id))
    assert result.record.strategy == "count"
    assert result.record.count == 12
    assert result.record.entity_id == ENTITY_A
    assert result.record.reservation_id == reservation_id
    assert result.exceeds_capacity is False
    assert result.below_min_attendance is False
    items = ListReservations(uow).execute(
        ListReservationsQuery(
            entity_id=ENTITY_A,
            actor_user_id=USER_A,
            actor_role=MembershipRole.COORDINATOR,
            starts_at=_slot(8)[0],
            ends_at=_slot(20)[1],
        )
    )
    assert items[0].attendance_count == 12
    assert items[0].capacity == 40


def test_zero_count_is_allowed() -> None:
    recorder, _uow, reservation_id = _use_case()
    result = recorder.execute(_command(reservation_id, count=0))
    assert result.record.count == 0


def test_negative_count_is_rejected() -> None:
    recorder, uow, reservation_id = _use_case()
    with pytest.raises(InvalidAttendanceError):
        recorder.execute(_command(reservation_id, count=-1))
    assert uow.attendance.list_by_reservation_ids(ENTITY_A, [reservation_id]) == {}


def test_other_coordinator_cannot_record() -> None:
    recorder, _uow, reservation_id = _use_case()
    with pytest.raises(ForbiddenError):
        recorder.execute(_command(reservation_id, actor_user_id=USER_B))


def test_responsible_cannot_record_others_reservation() -> None:
    recorder, _uow, reservation_id = _use_case()
    with pytest.raises(ForbiddenError):
        recorder.execute(_command(reservation_id, actor_user_id=USER_B))


def test_responsible_sees_count_on_list() -> None:
    recorder, uow, reservation_id = _use_case()
    recorder.execute(_command(reservation_id))
    items = ListReservations(uow).execute(
        ListReservationsQuery(
            entity_id=ENTITY_A,
            actor_user_id=USER_B,
            actor_role=MembershipRole.RESPONSIBLE,
            starts_at=_slot(8)[0],
            ends_at=_slot(20)[1],
        )
    )
    assert items[0].mine is False
    assert items[0].attendance_count == 12


def test_count_above_capacity_warns_but_saves() -> None:
    recorder, uow, reservation_id = _use_case(capacity=10)
    result = recorder.execute(_command(reservation_id, count=11))
    assert result.exceeds_capacity is True
    assert result.record.count == 11
    stored = uow.attendance.get_by_reservation_id(ENTITY_A, reservation_id)
    assert stored is not None
    assert stored.count == 11


def test_count_below_min_attendance_warns_but_saves() -> None:
    recorder, _uow, reservation_id = _use_case(min_attendance=8)
    result = recorder.execute(_command(reservation_id, count=3))
    assert result.below_min_attendance is True
    assert result.exceeds_capacity is False


def test_updating_count_replaces_previous() -> None:
    recorder, uow, reservation_id = _use_case()
    recorder.execute(_command(reservation_id, count=4))
    result = recorder.execute(_command(reservation_id, count=9))
    assert result.record.count == 9
    stored = uow.attendance.get_by_reservation_id(ENTITY_A, reservation_id)
    assert stored is not None
    assert stored.count == 9


def test_cancelled_reservation_cannot_record() -> None:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(_space())
    cancelled = Reservation(
        id=UUID(int=99),
        entity_id=ENTITY_A,
        space_id=SPACE_A,
        coordinator_id=USER_A,
        coordinator_name="Carla",
        starts_at=_slot()[0],
        ends_at=_slot()[1],
        status=ReservationStatus.CANCELLED,
        notes=None,
        created_at=datetime(2026, 9, 8, 12, tzinfo=MADRID),
    )
    uow.reservations.add(cancelled)
    uow.commit()
    recorder = RecordAttendance(uow, CountAttendance(), FixedClock(), SequentialIdGenerator())
    with pytest.raises(InvalidAttendanceError):
        recorder.execute(_command(cancelled.id))


def test_other_entity_does_not_find_reservation() -> None:
    recorder, _uow, reservation_id = _use_case()
    with pytest.raises(ReservationNotFoundError):
        recorder.execute(_command(reservation_id, entity_id=ENTITY_B))
