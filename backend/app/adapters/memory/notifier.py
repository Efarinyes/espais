"""Notifiers de test: in-memory i fallada SMTP."""

from __future__ import annotations

from app.domain.notification import Notification


class InMemoryNotifier:
    def __init__(self) -> None:
        self.sent: list[Notification] = []

    def send(self, notification: Notification) -> None:
        self.sent.append(notification)


class FailingNotifier:
    def send(self, notification: Notification) -> None:
        raise RuntimeError("smtp down")
