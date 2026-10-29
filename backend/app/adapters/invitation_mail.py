"""Correu d’invitació: SMTP si hi ha host i origen públic; si no, no s’envia."""

from __future__ import annotations

from app.adapters.public_origin import origen_public
from app.adapters.smtp_transport import SmtpConfig, SmtpTransport, smtp_config_from_env
from app.ports.invitation_mail import InvitationMessage, NoInvitationMailer


def text_invitacio(message: InvitationMessage, origin: str) -> tuple[str, str]:
    url = f"{origin}/invitar/{message.token}"
    subject = f"Invitació a {message.entity_name}"
    body = (
        f"{message.entity_name} et convida a Espais com a coordinador. "
        f"Obre aquest enllaç per crear el compte. Caduca al cap de 14 dies.\n{url}"
    )
    return subject, body


class SmtpInvitationMailer:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        from_addr: str,
        origin: str,
        starttls: bool = False,
        username: str = "",
        password: str = "",
    ) -> None:
        self._origin = origin
        self._transport = SmtpTransport(
            SmtpConfig(
                host=host,
                port=port,
                from_addr=from_addr,
                starttls=starttls,
                username=username,
                password=password,
            )
        )

    def configured(self) -> bool:
        return True

    def send(self, message: InvitationMessage) -> None:
        if not self._origin:
            raise RuntimeError("sense origen públic per a l’enllaç d’invitació")
        subject, body = text_invitacio(message, self._origin)
        self._transport.send(to_addr=message.to_email, subject=subject, body=body)


def build_invitation_mailer() -> NoInvitationMailer | SmtpInvitationMailer:
    config = smtp_config_from_env()
    if config is None:
        return NoInvitationMailer()
    return SmtpInvitationMailer(
        host=config.host,
        port=config.port,
        from_addr=config.from_addr,
        origin=origen_public(),
        starttls=config.starttls,
        username=config.username,
        password=config.password,
    )
