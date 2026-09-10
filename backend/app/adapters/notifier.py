"""Adaptadors de correu: log al dev; SMTP si hi ha configuració."""

from __future__ import annotations

import logging
import os
import smtplib
from collections.abc import Callable
from email.message import EmailMessage
from uuid import UUID

from app.domain.notification import Notification, NotificationType

logger = logging.getLogger("espais.notifier")


def text_correu(notification: Notification) -> tuple[str, str]:
    payload = notification.payload
    if notification.type == NotificationType.RESERVATION_RESCHEDULED:
        interval = f"{payload.starts_at}–{payload.ends_at}"
        if payload.new_starts_at and payload.new_ends_at:
            interval = f"{interval} → {payload.new_starts_at}–{payload.new_ends_at}"
        subject = f"Reserva reprogramada: {payload.space_name}"
        body = (
            f"{payload.entity_name}: s’ha canviat l’horari de {payload.space_name} "
            f"({interval}). Ho ha fet {payload.responsible_name}."
        )
    else:
        subject = f"Reserva anul·lada: {payload.space_name}"
        body = (
            f"{payload.entity_name}: s’ha anul·lat la reserva de {payload.space_name} "
            f"({payload.starts_at}–{payload.ends_at}). "
            f"Ho ha fet {payload.responsible_name}."
        )
    if payload.reason:
        body += f" Motiu: {payload.reason}."
    body += " Obre Espais per veure l’avís."
    return subject, body


class LoggingNotifier:
    def send(self, notification: Notification) -> None:
        payload = notification.payload
        logger.info(
            "avís %s per a user %s: %s %s–%s",
            notification.type,
            notification.user_id,
            payload.space_name,
            payload.starts_at,
            payload.ends_at,
        )


class SmtpNotifier:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        from_addr: str,
        lookup_email: Callable[[UUID], str | None],
    ) -> None:
        self._host = host
        self._port = port
        self._from_addr = from_addr
        self._lookup_email = lookup_email

    def send(self, notification: Notification) -> None:
        to_email = self._lookup_email(notification.user_id)
        if not to_email:
            raise RuntimeError("sense email del coordinador")
        subject, body = text_correu(notification)
        message = EmailMessage()
        message["From"] = self._from_addr
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(self._host, self._port, timeout=10) as smtp:
            smtp.send_message(message)


def build_notifier(lookup_email: Callable[[UUID], str | None] | None = None) -> LoggingNotifier | SmtpNotifier:
    host = os.environ.get("ESPAIS_SMTP_HOST", "").strip()
    if not host:
        return LoggingNotifier()
    if lookup_email is None:
        return LoggingNotifier()
    return SmtpNotifier(
        host=host,
        port=int(os.environ.get("ESPAIS_SMTP_PORT", "587")),
        from_addr=os.environ.get("ESPAIS_SMTP_FROM", "espais@localhost"),
        lookup_email=lookup_email,
    )
