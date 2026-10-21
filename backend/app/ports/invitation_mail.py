"""Enviament de l’enllaç d’invitació. El cas d’ús no parla d’SMTP."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class InvitationMessage:
    to_email: str
    entity_name: str
    token: str


class InvitationMailer(Protocol):
    def configured(self) -> bool: ...

    def send(self, message: InvitationMessage) -> None: ...


class NoInvitationMailer:
    def configured(self) -> bool:
        return False

    def send(self, message: InvitationMessage) -> None:
        return None
