"""Ocupació horària: hores reservades vs disponibles. Sense I/O."""

from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.domain.reservation import as_utc
from app.domain.space import AvailabilityWindow

MADRID = ZoneInfo("Europe/Madrid")


def overlap_hours(
    starts_at: datetime,
    ends_at: datetime,
    period_start: datetime,
    period_end: datetime,
) -> float:
    start = max(as_utc(starts_at), as_utc(period_start))
    end = min(as_utc(ends_at), as_utc(period_end))
    if end <= start:
        return 0.0
    return (end - start).total_seconds() / 3600


def available_hours(
    windows: tuple[AvailabilityWindow, ...],
    period_start: datetime,
    period_end: datetime,
) -> float:
    start_local = as_utc(period_start).astimezone(MADRID)
    end_local = as_utc(period_end).astimezone(MADRID)
    if end_local <= start_local:
        return 0.0
    total = 0.0
    cursor = start_local.date()
    last = end_local.date()
    if end_local.time() != time.min:
        last = last + timedelta(days=1)
    while cursor < last:
        weekday = cursor.weekday()
        day_midnight = datetime.combine(cursor, time.min, tzinfo=MADRID)
        for window in windows:
            if window.weekday != weekday:
                continue
            window_start = day_midnight.replace(
                hour=window.start.hour,
                minute=window.start.minute,
                second=window.start.second,
                microsecond=0,
            )
            window_end = day_midnight.replace(
                hour=window.end.hour,
                minute=window.end.minute,
                second=window.end.second,
                microsecond=0,
            )
            total += overlap_hours(window_start, window_end, period_start, period_end)
        cursor += timedelta(days=1)
    return total


def occupancy_ratio(reserved: float, available: float) -> float:
    if available <= 0:
        return 0.0
    return reserved / available
