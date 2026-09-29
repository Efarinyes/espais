from datetime import datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

import pytest

from app.adapters.memory.identity import FixedClock, SequentialIdGenerator
from app.adapters.memory.reservations import InMemoryReservationUnitOfWork
from app.domain.errors import (
    ForbiddenError,
    InvalidReservationError,
    ReservationOverlapError,
    SpaceNotFoundError,
)
from app.domain.identity import MembershipRole
from app.domain.space import AvailabilityWindow, Space, default_week_windows
from app.usecases.create_reservation import CreateReservation, CreateReservationCommand
from app.usecases.list_reservations import ListReservations, ListReservationsQuery

MADRID = ZoneInfo("Europe/Madrid")
ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)
USER_A = UUID(int=100)
USER_B = UUID(int=200)
SPACE_A = UUID(int=1)


def _space(
    *,
    entity_id: UUID = ENTITY_A,
    space_id: UUID = SPACE_A,
    windows: tuple[AvailabilityWindow, ...] | None = None,
    active: bool = True,
) -> Space:
    return Space(
        id=space_id,
        entity_id=entity_id,
        name="Sala 1",
        capacity=40,
        equipment=None,
        min_attendance=None,
        active=active,
        created_at=datetime(2026, 9, 8, 12, tzinfo=MADRID),
        windows=windows if windows is not None else default_week_windows(),
    )


def _slot(hour: int, *, minute: int = 0, duration_minutes: int = 60, day: int = 8) -> tuple[datetime, datetime]:
    start = datetime(2026, 9, day, hour, minute, tzinfo=MADRID)
    return start, start + timedelta(minutes=duration_minutes)


def _command(**overrides: object) -> CreateReservationCommand:
    start, end = _slot(10)
    data: dict[str, object] = {
        "entity_id": ENTITY_A,
        "actor_user_id": USER_A,
        "actor_role": MembershipRole.COORDINATOR,
        "actor_name": "Carla",
        "space_id": SPACE_A,
        "starts_at": start,
        "ends_at": end,
        "notes": None,
    }
    data.update(overrides)
    return CreateReservationCommand(**data)  # type: ignore[arg-type]


def _use_case(
    uow: InMemoryReservationUnitOfWork | None = None,
) -> tuple[CreateReservation, InMemoryReservationUnitOfWork]:
    unit = uow or InMemoryReservationUnitOfWork()
    if not unit.spaces.list_by_entity_id(ENTITY_A):
        unit.spaces.add(_space())
        unit.commit()
    return CreateReservation(unit, FixedClock(), SequentialIdGenerator()), unit


def test_create_reservation_is_confirmed_inside_windows() -> None:
    use_case, uow = _use_case()
    result = use_case.execute(_command())
    assert result.reservation.entity_id == ENTITY_A
    assert result.reservation.space_id == SPACE_A
    assert result.reservation.coordinator_id == USER_A
    assert result.reservation.coordinator_name == "Carla"
    assert result.reservation.status.value == "confirmed"
    listed = ListReservations(uow).execute(
        ListReservationsQuery(
            entity_id=ENTITY_A,
            actor_user_id=USER_A,
            actor_role=MembershipRole.COORDINATOR,
            starts_at=_slot(8)[0],
            ends_at=_slot(20)[1],
        )
    )
    assert len(listed) == 1
    assert listed[0].mine is True
    assert listed[0].coordinator_name == "Carla"
    assert listed[0].space_name == "Sala 1"


def test_responsible_cannot_create_reservation() -> None:
    use_case, uow = _use_case()
    with pytest.raises(ForbiddenError, match="responsable no crea"):
        use_case.execute(_command(actor_role=MembershipRole.RESPONSIBLE, actor_name="Anna"))
    assert uow.reservations.list_all() == []


def test_overlapping_confirmed_reservation_is_rejected() -> None:
    use_case, uow = _use_case()
    use_case.execute(_command())
    with pytest.raises(ReservationOverlapError):
        use_case.execute(_command(actor_user_id=USER_B, actor_name="Berta", starts_at=_slot(10, minute=30)[0], ends_at=_slot(11, minute=30)[0]))
    assert len(uow.reservations.list_all()) == 1


def test_adjacent_intervals_are_allowed() -> None:
    use_case, uow = _use_case()
    first_start, first_end = _slot(10)
    second_start, second_end = _slot(11)
    use_case.execute(_command(starts_at=first_start, ends_at=first_end))
    use_case.execute(
        _command(
            actor_user_id=USER_B,
            actor_name="Berta",
            starts_at=second_start,
            ends_at=second_end,
        )
    )
    assert len(uow.reservations.list_all()) == 2


def test_outside_availability_window_is_rejected() -> None:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(
        _space(windows=(AvailabilityWindow(weekday=0, start=time(8, 0), end=time(22, 0)),))
    )
    uow.commit()
    use_case = CreateReservation(uow, FixedClock(), SequentialIdGenerator())
    with pytest.raises(InvalidReservationError):
        use_case.execute(_command())
    assert uow.reservations.list_all() == []


def test_inactive_space_cannot_be_reserved() -> None:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(_space(active=False))
    uow.commit()
    with pytest.raises(InvalidReservationError):
        CreateReservation(uow, FixedClock(), SequentialIdGenerator()).execute(_command())


def test_inverted_hours_rejected_before_missing_space() -> None:
    uow = InMemoryReservationUnitOfWork()
    start, end = _slot(10)
    with pytest.raises(InvalidReservationError, match="anterior a la de fi"):
        CreateReservation(uow, FixedClock(), SequentialIdGenerator()).execute(
            _command(starts_at=end, ends_at=start)
        )
    assert uow.reservations.list_all() == []


def test_inverted_hours_rejected_before_inactive_space() -> None:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(_space(active=False))
    uow.commit()
    start, end = _slot(10)
    with pytest.raises(InvalidReservationError, match="anterior a la de fi"):
        CreateReservation(uow, FixedClock(), SequentialIdGenerator()).execute(
            _command(starts_at=end, ends_at=start)
        )
    assert uow.reservations.list_all() == []


def test_space_of_other_entity_is_not_found() -> None:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(_space(entity_id=ENTITY_B, space_id=UUID(int=2)))
    uow.commit()
    with pytest.raises(SpaceNotFoundError):
        CreateReservation(uow, FixedClock(), SequentialIdGenerator()).execute(_command())


def test_coordinator_does_not_see_other_coordinator_name() -> None:
    use_case, uow = _use_case()
    use_case.execute(_command())
    items = ListReservations(uow).execute(
        ListReservationsQuery(
            entity_id=ENTITY_A,
            actor_user_id=USER_B,
            actor_role=MembershipRole.COORDINATOR,
            starts_at=_slot(8)[0],
            ends_at=_slot(20)[1],
        )
    )
    assert len(items) == 1
    assert items[0].mine is False
    assert items[0].coordinator_name is None


def test_responsible_sees_all_with_coordinator_name() -> None:
    use_case, uow = _use_case()
    use_case.execute(_command())
    items = ListReservations(uow).execute(
        ListReservationsQuery(
            entity_id=ENTITY_A,
            actor_user_id=USER_B,
            actor_role=MembershipRole.RESPONSIBLE,
            starts_at=_slot(8)[0],
            ends_at=_slot(20)[1],
        )
    )
    assert items[0].coordinator_name == "Carla"
    assert items[0].mine is False


def test_list_does_not_leak_other_entity() -> None:
    use_case, uow = _use_case()
    use_case.execute(_command())
    items = ListReservations(uow).execute(
        ListReservationsQuery(
            entity_id=ENTITY_B,
            actor_user_id=USER_A,
            actor_role=MembershipRole.RESPONSIBLE,
            starts_at=_slot(8)[0],
            ends_at=_slot(20)[1],
        )
    )
    assert items == []
