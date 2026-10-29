"""Enviament de l’enllaç de recuperació. El cas d’ús no parla d’SMTP."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PasswordResetMessage:
    to_email: str
    token: str


class PasswordResetMailer(Protocol):
    def configured(self) -> bool: ...

    def send(self, message: PasswordResetMessage) -> None: ...


class NoPasswordResetMailer:
    def configured(self) -> bool:
        return False

    def send(self, message: PasswordResetMessage) -> None:
        return None
