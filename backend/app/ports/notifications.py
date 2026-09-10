"""Ports d’avisos: persistència acotada a entity_id i enviament de correu."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.domain.notification import Notification


class NotificationRepository(Protocol):
    def add(self, notification: Notification) -> None: ...

    def save(self, notification: Notification) -> None: ...

    def get_by_id(self, entity_id: UUID, notification_id: UUID) -> Notification | None: ...

    def list_for_user(self, entity_id: UUID, user_id: UUID) -> list[Notification]: ...


class Notifier(Protocol):
    def send(self, notification: Notification) -> None: ...
