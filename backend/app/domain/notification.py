"""Avís in-app al coordinador. Sense I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID


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


def payload_as_dict(payload: NotificationPayload) -> dict[str, str | None]:
    return {
        "entity_name": payload.entity_name,
        "space_name": payload.space_name,
        "starts_at": payload.starts_at,
        "ends_at": payload.ends_at,
        "responsible_name": payload.responsible_name,
        "reason": payload.reason,
        "new_starts_at": payload.new_starts_at,
        "new_ends_at": payload.new_ends_at,
    }


def payload_from_dict(raw: dict[str, object]) -> NotificationPayload:
    reason = raw.get("reason")
    new_starts = raw.get("new_starts_at")
    new_ends = raw.get("new_ends_at")
    return NotificationPayload(
        entity_name=str(raw.get("entity_name") or ""),
        space_name=str(raw.get("space_name") or ""),
        starts_at=str(raw.get("starts_at") or ""),
        ends_at=str(raw.get("ends_at") or ""),
        responsible_name=str(raw.get("responsible_name") or ""),
        reason=str(reason) if isinstance(reason, str) and reason.strip() else None,
        new_starts_at=str(new_starts) if isinstance(new_starts, str) and new_starts.strip() else None,
        new_ends_at=str(new_ends) if isinstance(new_ends, str) and new_ends.strip() else None,
    )
