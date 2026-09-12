from datetime import datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

import pytest

from app.adapters.memory.reservations import InMemoryReservationUnitOfWork
from app.domain.attendance import COUNT_STRATEGY, AttendanceRecord
from app.domain.errors import ForbiddenError
from app.domain.identity import MembershipRole
from app.domain.reservation import Reservation, ReservationStatus
from app.domain.space import AvailabilityWindow, Space, default_week_windows
from app.usecases.get_usage_summary import GetUsageSummary, GetUsageSummaryQuery

MADRID = ZoneInfo("Europe/Madrid")
ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)
USER_A = UUID(int=100)
SPACE_A = UUID(int=1)
SPACE_B = UUID(int=2)
PERIOD_START = datetime(2026, 9, 8, 0, 0, tzinfo=MADRID)
PERIOD_END = datetime(2026, 9, 9, 0, 0, tzinfo=MADRID)


def _space(
    *,
    entity_id: UUID = ENTITY_A,
    space_id: UUID = SPACE_A,
    name: str = "Sala 1",
    capacity: int = 40,
    min_attendance: int | None = None,
    windows: tuple[AvailabilityWindow, ...] | None = None,
) -> Space:
    return Space(
        id=space_id,
        entity_id=entity_id,
        name=name,
        capacity=capacity,
        equipment=None,
        min_attendance=min_attendance,
        active=True,
        created_at=datetime(2026, 9, 8, 12, tzinfo=MADRID),
        windows=windows if windows is not None else default_week_windows(),
    )


def _reservation(
    *,
    reservation_id: UUID,
    entity_id: UUID = ENTITY_A,
    space_id: UUID = SPACE_A,
    status: ReservationStatus = ReservationStatus.CONFIRMED,
    hour: int = 10,
    duration_hours: int = 1,
) -> Reservation:
    start = datetime(2026, 9, 8, hour, 0, tzinfo=MADRID)
    return Reservation(
        id=reservation_id,
        entity_id=entity_id,
        space_id=space_id,
        coordinator_id=USER_A,
        coordinator_name="Carla",
        starts_at=start,
        ends_at=start + timedelta(hours=duration_hours),
        status=status,
        notes=None,
        created_at=datetime(2026, 9, 8, 8, tzinfo=MADRID),
    )


def _attendance(reservation_id: UUID, count: int, *, entity_id: UUID = ENTITY_A) -> AttendanceRecord:
    return AttendanceRecord(
        id=UUID(int=reservation_id.int + 1000),
        entity_id=entity_id,
        reservation_id=reservation_id,
        strategy=COUNT_STRATEGY,
        count=count,
        recorded_at=datetime(2026, 9, 8, 12, tzinfo=MADRID),
    )


def _uow(*spaces: Space) -> InMemoryReservationUnitOfWork:
    uow = InMemoryReservationUnitOfWork()
    for space in spaces or (_space(),):
        uow.spaces.add(space)
    uow.commit()
    return uow


def _query(**overrides: object) -> GetUsageSummaryQuery:
    data: dict[str, object] = {
        "entity_id": ENTITY_A,
        "actor_role": MembershipRole.RESPONSIBLE,
        "starts_at": PERIOD_START,
        "ends_at": PERIOD_END,
    }
    data.update(overrides)
    return GetUsageSummaryQuery(**data)  # type: ignore[arg-type]


def test_coordinator_cannot_see_usage_summary() -> None:
    uow = _uow()
    with pytest.raises(ForbiddenError, match="anàlisi"):
        GetUsageSummary(uow).execute(_query(actor_role=MembershipRole.COORDINATOR))


def test_does_not_include_other_entity_reservations() -> None:
    uow = _uow(_space(), _space(entity_id=ENTITY_B, space_id=SPACE_B, name="Sala B"))
    uow.reservations.add(_reservation(reservation_id=UUID(int=11)))
    uow.reservations.add(
        _reservation(reservation_id=UUID(int=22), entity_id=ENTITY_B, space_id=SPACE_B)
    )
    uow.attendance.save(_attendance(UUID(int=22), 99, entity_id=ENTITY_B))
    uow.commit()

    summary = GetUsageSummary(uow).execute(_query())
    assert summary.confirmed_count == 1
    assert summary.cancelled_count == 0
    assert summary.reserved_hours == pytest.approx(1.0)
    assert summary.available_hours == pytest.approx(14.0)
    assert summary.occupancy_ratio == pytest.approx(1 / 14)
    assert [row.space_id for row in summary.spaces] == [SPACE_A]
    assert summary.average_attendance is None
    assert summary.unregistered_count == 1


def test_cancelled_counts_as_cancelled_not_occupancy() -> None:
    uow = _uow()
    uow.reservations.add(_reservation(reservation_id=UUID(int=11)))
    uow.reservations.add(
        _reservation(reservation_id=UUID(int=12), status=ReservationStatus.CANCELLED, hour=12)
    )
    uow.commit()

    summary = GetUsageSummary(uow).execute(_query())
    assert summary.confirmed_count == 1
    assert summary.cancelled_count == 1
    assert summary.reserved_hours == pytest.approx(1.0)
    assert summary.occupancy_ratio == pytest.approx(1 / 14)
    row = summary.spaces[0]
    assert row.confirmed_count == 1
    assert row.cancelled_count == 1
    assert row.reserved_hours == pytest.approx(1.0)


def test_average_attendance_ignores_unregistered() -> None:
    uow = _uow(_space(min_attendance=8))
    first = UUID(int=11)
    second = UUID(int=12)
    uow.reservations.add(_reservation(reservation_id=first, hour=10))
    uow.reservations.add(_reservation(reservation_id=second, hour=12))
    uow.attendance.save(_attendance(first, 10))
    uow.commit()

    summary = GetUsageSummary(uow).execute(_query())
    assert summary.average_attendance == pytest.approx(10.0)
    assert summary.unregistered_count == 1
    assert summary.below_min_attendance is False
    row = summary.spaces[0]
    assert row.average_attendance == pytest.approx(10.0)
    assert row.unregistered_count == 1
    assert row.below_min_attendance is False


def test_average_below_min_attendance_is_flagged() -> None:
    uow = _uow(_space(min_attendance=8))
    reservation_id = UUID(int=11)
    uow.reservations.add(_reservation(reservation_id=reservation_id))
    uow.attendance.save(_attendance(reservation_id, 3))
    uow.commit()

    summary = GetUsageSummary(uow).execute(_query())
    assert summary.average_attendance == pytest.approx(3.0)
    assert summary.below_min_attendance is True
    assert summary.spaces[0].below_min_attendance is True


def test_occupancy_uses_availability_windows() -> None:
    windows = (AvailabilityWindow(weekday=1, start=time(18, 0), end=time(22, 0)),)
    uow = _uow(_space(windows=windows))
    uow.reservations.add(_reservation(reservation_id=UUID(int=11), hour=18, duration_hours=2))
    uow.commit()

    summary = GetUsageSummary(uow).execute(_query())
    assert summary.available_hours == pytest.approx(4.0)
    assert summary.reserved_hours == pytest.approx(2.0)
    assert summary.occupancy_ratio == pytest.approx(0.5)


def test_optional_space_id_filters_rows() -> None:
    uow = _uow(_space(), _space(space_id=SPACE_B, name="Sala 2"))
    uow.reservations.add(_reservation(reservation_id=UUID(int=11), space_id=SPACE_A))
    uow.reservations.add(_reservation(reservation_id=UUID(int=12), space_id=SPACE_B, hour=12))
    uow.commit()

    summary = GetUsageSummary(uow).execute(_query(space_id=SPACE_B))
    assert [row.space_id for row in summary.spaces] == [SPACE_B]
    assert summary.confirmed_count == 1
    assert summary.reserved_hours == pytest.approx(1.0)
    assert summary.available_hours == pytest.approx(14.0)
