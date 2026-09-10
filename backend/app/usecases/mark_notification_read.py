"""Marca un avís com a llegit. Només el destinatari."""

from __future__ import annotations

from dataclasses import dataclass, replace
from uuid import UUID

from app.domain.errors import NotificationNotFoundError
from app.domain.notification import Notification
from app.ports.identity import Clock
from app.ports.reservations import ReservationUnitOfWork


@dataclass(frozen=True)
class MarkNotificationReadCommand:
    entity_id: UUID
    actor_user_id: UUID
    notification_id: UUID


@dataclass(frozen=True)
class MarkNotificationReadResult:
    notification: Notification


class MarkNotificationRead:
    def __init__(self, uow: ReservationUnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    def execute(self, command: MarkNotificationReadCommand) -> MarkNotificationReadResult:
        notification = self._uow.notifications.get_by_id(command.entity_id, command.notification_id)
        if notification is None or notification.user_id != command.actor_user_id:
            raise NotificationNotFoundError()
        if notification.read_at is not None:
            return MarkNotificationReadResult(notification=notification)
        updated = replace(notification, read_at=self._clock.now())
        try:
            self._uow.notifications.save(updated)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return MarkNotificationReadResult(notification=updated)
