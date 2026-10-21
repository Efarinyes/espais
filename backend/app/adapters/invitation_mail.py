"""Correu d’invitació: SMTP si hi ha host i origen públic; si no, no s’envia."""

from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage

from app.ports.invitation_mail import InvitationMessage, NoInvitationMailer


def origen_public() -> str:
    raw = os.environ.get("ESPAIS_DOMAIN", "").strip().rstrip("/")
    if not raw:
        return ""
    if "://" in raw:
        return raw
    return f"https://{raw}"


def text_invitacio(message: InvitationMessage, origin: str) -> tuple[str, str]:
    url = f"{origin}/invitar/{message.token}"
    subject = f"Invitació a {message.entity_name}"
    body = (
        f"{message.entity_name} et convida a Espais com a coordinador. "
        f"Obre aquest enllaç per crear el compte. Caduca al cap de 14 dies.\n{url}"
    )
    return subject, body


class SmtpInvitationMailer:
    def __init__(self, *, host: str, port: int, from_addr: str, origin: str) -> None:
        self._host = host
        self._port = port
        self._from_addr = from_addr
        self._origin = origin

    def configured(self) -> bool:
        return True

    def send(self, message: InvitationMessage) -> None:
        if not self._origin:
            raise RuntimeError("sense origen públic per a l’enllaç d’invitació")
        subject, body = text_invitacio(message, self._origin)
        email = EmailMessage()
        email["From"] = self._from_addr
        email["To"] = message.to_email
        email["Subject"] = subject
        email.set_content(body)
        with smtplib.SMTP(self._host, self._port, timeout=10) as smtp:
            smtp.send_message(email)


def build_invitation_mailer() -> NoInvitationMailer | SmtpInvitationMailer:
    host = os.environ.get("ESPAIS_SMTP_HOST", "").strip()
    if not host:
        return NoInvitationMailer()
    return SmtpInvitationMailer(
        host=host,
        port=int(os.environ.get("ESPAIS_SMTP_PORT", "587")),
        from_addr=os.environ.get("ESPAIS_SMTP_FROM", "espais@localhost"),
        origin=origen_public(),
    )
