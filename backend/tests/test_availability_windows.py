from datetime import time
from uuid import UUID

import pytest

from app.adapters.memory.identity import SequentialIdGenerator
from app.adapters.memory.spaces import InMemorySpaceUnitOfWork
from app.domain.errors import InvalidSpaceError
from app.domain.identity import MembershipRole
from app.domain.space import AvailabilityWindow, default_week_windows, validate_windows
from app.usecases.create_space import CreateSpace, CreateSpaceCommand
from app.usecases.get_space import GetSpace
from app.usecases.update_space import UpdateSpace, UpdateSpaceCommand
from app.adapters.memory.identity import FixedClock

ENTITY_A = UUID(int=10)


def _weekday_windows(*days: int, start: time = time(9, 0), end: time = time(18, 0)) -> tuple[AvailabilityWindow, ...]:
    return tuple(AvailabilityWindow(weekday=day, start=start, end=end) for day in days)


def test_validate_windows_rejects_empty() -> None:
    with pytest.raises(InvalidSpaceError, match="almenys una finestra"):
        validate_windows(())


def test_validate_windows_rejects_inverted_hours() -> None:
    with pytest.raises(InvalidSpaceError, match="inici"):
        validate_windows((AvailabilityWindow(weekday=0, start=time(18, 0), end=time(9, 0)),))


def test_validate_windows_rejects_overlap_same_day() -> None:
    with pytest.raises(InvalidSpaceError, match="solapar"):
        validate_windows(
            (
                AvailabilityWindow(weekday=0, start=time(8, 0), end=time(14, 0)),
                AvailabilityWindow(weekday=0, start=time(12, 0), end=time(18, 0)),
            )
        )


def test_validate_windows_allows_adjacent_same_day() -> None:
    result = validate_windows(
        (
            AvailabilityWindow(weekday=0, start=time(12, 0), end=time(18, 0)),
            AvailabilityWindow(weekday=0, start=time(8, 0), end=time(12, 0)),
        )
    )
    assert result[0].start == time(8, 0)
    assert result[1].start == time(12, 0)


def test_create_space_accepts_custom_windows() -> None:
    uow = InMemorySpaceUnitOfWork()
    windows = _weekday_windows(0, 1, 2, 3, 4)
    space = CreateSpace(uow, FixedClock(), SequentialIdGenerator()).execute(
        CreateSpaceCommand(
            entity_id=ENTITY_A,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=20,
            windows=windows,
        )
    ).space
    assert tuple(w.weekday for w in space.windows) == (0, 1, 2, 3, 4)
    assert space.windows[0].start == time(9, 0)
    assert space.windows[0].end == time(18, 0)


def test_create_space_rejects_empty_windows() -> None:
    uow = InMemorySpaceUnitOfWork()
    with pytest.raises(InvalidSpaceError, match="almenys una finestra"):
        CreateSpace(uow, FixedClock(), SequentialIdGenerator()).execute(
            CreateSpaceCommand(
                entity_id=ENTITY_A,
                actor_role=MembershipRole.RESPONSIBLE,
                name="Sala 1",
                capacity=20,
                windows=(),
            )
        )


def test_update_space_replaces_windows() -> None:
    uow = InMemorySpaceUnitOfWork()
    created = CreateSpace(uow, FixedClock(), SequentialIdGenerator()).execute(
        CreateSpaceCommand(
            entity_id=ENTITY_A,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=20,
        )
    )
    assert created.space.windows == default_week_windows()
    updated = UpdateSpace(uow).execute(
        UpdateSpaceCommand(
            entity_id=ENTITY_A,
            space_id=created.space.id,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=20,
            windows=_weekday_windows(5, 6, start=time(10, 0), end=time(14, 0)),
        )
    )
    space = GetSpace(uow).execute(ENTITY_A, created.space.id)
    assert tuple(w.weekday for w in space.windows) == (5, 6)
    assert space.windows[0].start == time(10, 0)
    assert space.windows == updated.space.windows


def test_update_space_keeps_windows_when_omitted() -> None:
    uow = InMemorySpaceUnitOfWork()
    created = CreateSpace(uow, FixedClock(), SequentialIdGenerator()).execute(
        CreateSpaceCommand(
            entity_id=ENTITY_A,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=20,
            windows=_weekday_windows(0),
        )
    )
    UpdateSpace(uow).execute(
        UpdateSpaceCommand(
            entity_id=ENTITY_A,
            space_id=created.space.id,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala gran",
            capacity=30,
        )
    )
    space = GetSpace(uow).execute(ENTITY_A, created.space.id)
    assert tuple(w.weekday for w in space.windows) == (0,)
    assert space.name == "Sala gran"
