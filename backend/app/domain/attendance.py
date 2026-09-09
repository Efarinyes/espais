"""Assistència: compte v1, extensible per estratègia. Sense I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

COUNT_STRATEGY = "count"


@dataclass(frozen=True)
class AttendanceValue:
    strategy: str
    count: int


@dataclass(frozen=True)
class AttendanceRecord:
    id: UUID
    entity_id: UUID
    reservation_id: UUID
    strategy: str
    count: int
    recorded_at: datetime


def attendance_flags(
    count: int | None,
    capacity: int,
    min_attendance: int | None,
) -> tuple[bool, bool]:
    if count is None:
        return False, False
    exceeds = count > capacity
    below = min_attendance is not None and count < min_attendance
    return exceeds, below
