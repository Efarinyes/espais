"""Enviament de l’enllaç de verificació. El cas d’ús no parla d’SMTP."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class EmailVerificationMessage:
    to_email: str
    token: str


class EmailVerificationMailer(Protocol):
    def configured(self) -> bool: ...

    def send(self, message: EmailVerificationMessage) -> None: ...


class NoEmailVerificationMailer:
    def configured(self) -> bool:
        return False

    def send(self, message: EmailVerificationMessage) -> None:
        return None
