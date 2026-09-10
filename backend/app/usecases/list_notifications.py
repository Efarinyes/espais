"""Llista els avisos in-app del coordinador, acotats a entity_id."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.notification import Notification, NotificationType
from app.ports.reservations import ReservationUnitOfWork


@dataclass(frozen=True)
class ListNotificationsQuery:
    entity_id: UUID
    actor_user_id: UUID


@dataclass(frozen=True)
class NotificationListItem:
    id: UUID
    type: NotificationType
    reservation_id: UUID
    entity_name: str
    space_name: str
    starts_at: str
    ends_at: str
    new_starts_at: str | None
    new_ends_at: str | None
    responsible_name: str
    reason: str | None
    read_at: datetime | None
    created_at: datetime


def _to_item(notification: Notification) -> NotificationListItem:
    payload = notification.payload
    return NotificationListItem(
        id=notification.id,
        type=notification.type,
        reservation_id=notification.reservation_id,
        entity_name=payload.entity_name,
        space_name=payload.space_name,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        new_starts_at=payload.new_starts_at,
        new_ends_at=payload.new_ends_at,
        responsible_name=payload.responsible_name,
        reason=payload.reason,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )


class ListNotifications:
    def __init__(self, uow: ReservationUnitOfWork) -> None:
        self._uow = uow

    def execute(self, query: ListNotificationsQuery) -> list[NotificationListItem]:
        items = self._uow.notifications.list_for_user(query.entity_id, query.actor_user_id)
        return [_to_item(item) for item in items]
