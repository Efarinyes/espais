"""Espai: agregat de l’entitat. Sense I/O ni catàleg global."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time
from uuid import UUID

from app.domain.errors import InvalidSpaceError

DEFAULT_OPEN = time(8, 0)
DEFAULT_CLOSE = time(22, 0)


@dataclass(frozen=True)
class AvailabilityWindow:
    weekday: int
    start: time
    end: time


@dataclass(frozen=True)
class Space:
    id: UUID
    entity_id: UUID
    name: str
    capacity: int
    equipment: str | None
    min_attendance: int | None
    active: bool
    created_at: datetime
    windows: tuple[AvailabilityWindow, ...]


def normalize_space_name(name: str) -> str:
    return name.strip().casefold()


def default_week_windows() -> tuple[AvailabilityWindow, ...]:
    return tuple(
        AvailabilityWindow(weekday=day, start=DEFAULT_OPEN, end=DEFAULT_CLOSE) for day in range(7)
    )


def validate_windows(windows: tuple[AvailabilityWindow, ...]) -> tuple[AvailabilityWindow, ...]:
    if not windows:
        raise InvalidSpaceError("cal almenys una finestra de disponibilitat")
    cleaned: list[AvailabilityWindow] = []
    for window in windows:
        if window.weekday < 0 or window.weekday > 6:
            raise InvalidSpaceError("el dia de la setmana no és vàlid")
        if window.start >= window.end:
            raise InvalidSpaceError("l’hora d’inici ha de ser anterior a la de fi")
        cleaned.append(window)
    ordered = tuple(sorted(cleaned, key=lambda item: (item.weekday, item.start, item.end)))
    for previous, current in zip(ordered, ordered[1:]):
        if previous.weekday == current.weekday and current.start < previous.end:
            raise InvalidSpaceError("les finestres del mateix dia no es poden solapar")
    return ordered
