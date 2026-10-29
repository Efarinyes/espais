"""Correu de recuperació. L’enllaç usa el domini públic i el token va al fragment."""

from __future__ import annotations

from app.adapters.public_origin import origen_public
from app.adapters.smtp_transport import SmtpTransport, smtp_config_from_env
from app.ports.password_reset_mail import NoPasswordResetMailer, PasswordResetMessage


def text_recuperacio(token: str, origin: str) -> tuple[str, str]:
    url = f"{origin}/recuperar#{token}"
    subject = "Recupera l’accés a Espais"
    body = (
        "Has demanat una contrasenya nova a Espais. "
        "Obre aquest enllaç per triar-la. Caduca al cap d’una hora.\n"
        f"{url}\n"
        "Si no ho has demanat tu, ignora aquest missatge."
    )
    return subject, body


class SmtpPasswordResetMailer:
    def __init__(self, *, transport: SmtpTransport, origin: str) -> None:
        self._transport = transport
        self._origin = origin

    def configured(self) -> bool:
        return True

    def send(self, message: PasswordResetMessage) -> None:
        if not self._origin:
            raise RuntimeError("sense origen públic per a l’enllaç de recuperació")
        subject, body = text_recuperacio(message.token, self._origin)
        self._transport.send(to_addr=message.to_email, subject=subject, body=body)


def build_password_reset_mailer() -> NoPasswordResetMailer | SmtpPasswordResetMailer:
    config = smtp_config_from_env()
    if config is None:
        return NoPasswordResetMailer()
    return SmtpPasswordResetMailer(transport=SmtpTransport(config), origin=origen_public())
