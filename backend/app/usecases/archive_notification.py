"""Arxiva un avís ja llegit. Només el destinatari. Surt de la safata."""

from __future__ import annotations

from dataclasses import dataclass, replace
from uuid import UUID

from app.domain.errors import NotificationNotFoundError, NotificationNotReadError
from app.domain.notification import Notification
from app.ports.identity import Clock
from app.ports.reservations import ReservationUnitOfWork


@dataclass(frozen=True)
class ArchiveNotificationCommand:
    entity_id: UUID
    actor_user_id: UUID
    notification_id: UUID


@dataclass(frozen=True)
class ArchiveNotificationResult:
    notification: Notification


class ArchiveNotification:
    def __init__(self, uow: ReservationUnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    def execute(self, command: ArchiveNotificationCommand) -> ArchiveNotificationResult:
        notification = self._uow.notifications.get_by_id(command.entity_id, command.notification_id)
        if notification is None or notification.user_id != command.actor_user_id:
            raise NotificationNotFoundError()
        if notification.read_at is None:
            raise NotificationNotReadError()
        if notification.archived_at is not None:
            return ArchiveNotificationResult(notification=notification)
        updated = replace(notification, archived_at=self._clock.now())
        try:
            self._uow.notifications.save(updated)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return ArchiveNotificationResult(notification=updated)
