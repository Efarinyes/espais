"""Reserva: interval UTC, estat i titular. Sense I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, time
from enum import StrEnum
from uuid import UUID
from zoneinfo import ZoneInfo

from app.domain.space import AvailabilityWindow

MADRID = ZoneInfo("Europe/Madrid")


class ReservationStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


@dataclass(frozen=True)
class Reservation:
    id: UUID
    entity_id: UUID
    space_id: UUID
    coordinator_id: UUID
    coordinator_name: str
    starts_at: datetime
    ends_at: datetime
    status: ReservationStatus
    notes: str | None
    created_at: datetime


def as_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment.astimezone(UTC)


def intervals_overlap(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    return as_utc(start_a) < as_utc(end_b) and as_utc(end_a) > as_utc(start_b)


def interval_fits_windows(
    starts_at: datetime,
    ends_at: datetime,
    windows: tuple[AvailabilityWindow, ...],
) -> bool:
    start_local = as_utc(starts_at).astimezone(MADRID)
    end_local = as_utc(ends_at).astimezone(MADRID)
    if start_local.date() != end_local.date():
        return False
    start_t = time(start_local.hour, start_local.minute, start_local.second)
    end_t = time(end_local.hour, end_local.minute, end_local.second)
    weekday = start_local.weekday()
    return any(
        window.weekday == weekday and start_t >= window.start and end_t <= window.end for window in windows
    )
