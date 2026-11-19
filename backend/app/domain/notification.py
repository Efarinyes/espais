"""Avís in-app al coordinador. Sense I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum
from uuid import UUID

from app.domain.reservation import MADRID, as_utc

ARCHIVED_NOTIFICATION_RETENTION = timedelta(weeks=3)


class NotificationType(StrEnum):
    RESERVATION_CANCELLED = "reservation_cancelled"
    RESERVATION_RESCHEDULED = "reservation_rescheduled"


@dataclass(frozen=True)
class NotificationPayload:
    entity_name: str
    space_name: str
    starts_at: str
    ends_at: str
    responsible_name: str
    reason: str | None = None
    new_starts_at: str | None = None
    new_ends_at: str | None = None
    changes: tuple[str, ...] = ()
    space_id: str | None = None


@dataclass(frozen=True)
class Notification:
    id: UUID
    entity_id: UUID
    user_id: UUID
    reservation_id: UUID
    type: NotificationType
    payload: NotificationPayload
    created_at: datetime
    read_at: datetime | None = None
    archived_at: datetime | None = None


CHANGE_DATE = "date"
CHANGE_START_TIME = "start_time"
CHANGE_END_TIME = "end_time"
_KNOWN_CHANGES = (CHANGE_DATE, CHANGE_START_TIME, CHANGE_END_TIME)


def reservation_changes(
    old_start: datetime,
    old_end: datetime,
    new_start: datetime,
    new_end: datetime,
) -> tuple[str, ...]:
    """Què ha canviat entre dos intervals, en hora de Madrid. Buit si res no canvia."""
    old_s = as_utc(old_start).astimezone(MADRID)
    old_e = as_utc(old_end).astimezone(MADRID)
    new_s = as_utc(new_start).astimezone(MADRID)
    new_e = as_utc(new_end).astimezone(MADRID)
    changes: list[str] = []
    if old_s.date() != new_s.date():
        changes.append(CHANGE_DATE)
    if (old_s.hour, old_s.minute) != (new_s.hour, new_s.minute):
        changes.append(CHANGE_START_TIME)
    if (old_e.hour, old_e.minute) != (new_e.hour, new_e.minute):
        changes.append(CHANGE_END_TIME)
    return tuple(changes)


def payload_as_dict(payload: NotificationPayload) -> dict[str, object]:
    return {
        "entity_name": payload.entity_name,
        "space_name": payload.space_name,
        "starts_at": payload.starts_at,
        "ends_at": payload.ends_at,
        "responsible_name": payload.responsible_name,
        "reason": payload.reason,
        "new_starts_at": payload.new_starts_at,
        "new_ends_at": payload.new_ends_at,
        "changes": list(payload.changes),
        "space_id": payload.space_id,
    }


def payload_from_dict(raw: dict[str, object]) -> NotificationPayload:
    reason = raw.get("reason")
    new_starts = raw.get("new_starts_at")
    new_ends = raw.get("new_ends_at")
    space_id = raw.get("space_id")
    raw_changes = raw.get("changes")
    changes = (
        tuple(item for item in raw_changes if item in _KNOWN_CHANGES)
        if isinstance(raw_changes, list)
        else ()
    )
    return NotificationPayload(
        entity_name=str(raw.get("entity_name") or ""),
        space_name=str(raw.get("space_name") or ""),
        starts_at=str(raw.get("starts_at") or ""),
        ends_at=str(raw.get("ends_at") or ""),
        responsible_name=str(raw.get("responsible_name") or ""),
        reason=str(reason) if isinstance(reason, str) and reason.strip() else None,
        new_starts_at=str(new_starts) if isinstance(new_starts, str) and new_starts.strip() else None,
        new_ends_at=str(new_ends) if isinstance(new_ends, str) and new_ends.strip() else None,
        changes=changes,
        space_id=str(space_id) if isinstance(space_id, str) and space_id.strip() else None,
    )
