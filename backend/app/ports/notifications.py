"""Ports d’avisos: persistència acotada a entity_id i enviament de correu."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.domain.notification import Notification


class NotificationRepository(Protocol):
    def add(self, notification: Notification) -> None: ...

    def save(self, notification: Notification) -> None: ...

    def get_by_id(self, entity_id: UUID, notification_id: UUID) -> Notification | None: ...

    def list_for_user(self, entity_id: UUID, user_id: UUID) -> list[Notification]: ...

    def list_for_reservations(
        self, entity_id: UUID, reservation_ids: list[UUID]
    ) -> list[Notification]:
        """Tots els avisos de les reserves, també els arxivats: el responsable en veu l’estat."""
        ...

    def list_recent(self, entity_id: UUID, limit: int) -> list[Notification]: ...

    def delete_archived_before(self, cutoff: datetime) -> int: ...


class Notifier(Protocol):
    def send(self, notification: Notification) -> None: ...
