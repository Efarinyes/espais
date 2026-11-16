"""Correu de verificació. L’enllaç usa el domini públic i el token va al fragment."""

from __future__ import annotations

from app.adapters.public_origin import origen_public
from app.adapters.smtp_transport import SmtpTransport, smtp_config_from_env
from app.ports.email_verification_mail import (
    EmailVerificationMessage,
    NoEmailVerificationMailer,
)


def text_verificacio(token: str, origin: str) -> tuple[str, str]:
    url = f"{origin}/verificar#{token}"
    subject = "Verifica el correu d’Espais"
    body = (
        "Has registrat una entitat a Espais. "
        "Obre aquest enllaç per verificar el correu i activar el compte. "
        "Caduca al cap de 24 hores.\n"
        f"{url}\n"
        "Si no ho has demanat tu, ignora aquest missatge."
    )
    return subject, body


class SmtpEmailVerificationMailer:
    def __init__(self, *, transport: SmtpTransport, origin: str) -> None:
        self._transport = transport
        self._origin = origin

    def configured(self) -> bool:
        return True

    def send(self, message: EmailVerificationMessage) -> None:
        if not self._origin:
            raise RuntimeError("sense origen públic per a l’enllaç de verificació")
        subject, body = text_verificacio(message.token, self._origin)
        self._transport.send(to_addr=message.to_email, subject=subject, body=body)


def build_email_verification_mailer() -> NoEmailVerificationMailer | SmtpEmailVerificationMailer:
    config = smtp_config_from_env()
    if config is None:
        return NoEmailVerificationMailer()
    return SmtpEmailVerificationMailer(transport=SmtpTransport(config), origin=origen_public())
