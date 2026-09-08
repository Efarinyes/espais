"""Espai: agregat de l’entitat. Sense I/O ni catàleg global."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time
from uuid import UUID


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
