"""Transport SMTP compartit. Els casos d’ús no saben quin servidor hi ha al darrere."""

from __future__ import annotations

import os
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    from_addr: str
    starttls: bool
    username: str
    password: str


def _flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "si", "sí"}


def smtp_config_from_env() -> SmtpConfig | None:
    host = os.environ.get("ESPAIS_SMTP_HOST", "").strip()
    if not host:
        return None
    return SmtpConfig(
        host=host,
        port=int(os.environ.get("ESPAIS_SMTP_PORT", "587")),
        from_addr=os.environ.get("ESPAIS_SMTP_FROM", "espais@localhost"),
        starttls=_flag("ESPAIS_SMTP_STARTTLS"),
        username=os.environ.get("ESPAIS_SMTP_USER", "").strip(),
        password=os.environ.get("ESPAIS_SMTP_PASSWORD", ""),
    )


class SmtpTransport:
    def __init__(self, config: SmtpConfig) -> None:
        self._config = config

    def send(self, *, to_addr: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = self._config.from_addr
        message["To"] = to_addr
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(self._config.host, self._config.port, timeout=10) as smtp:
            if self._config.starttls:
                smtp.starttls()
            if self._config.username:
                smtp.login(self._config.username, self._config.password)
            smtp.send_message(message)
