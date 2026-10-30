"""Registre d'un enviament de correu fallit, sense adreces ni cos del missatge."""

from __future__ import annotations

import logging


def log_mail_failure(logger: logging.Logger, qual: str, exc: BaseException) -> None:
    code = _smtp_codes(exc)
    if code is None:
        logger.error("no s’ha pogut enviar el correu %s (%s)", qual, type(exc).__name__)
        return
    logger.error(
        "no s’ha pogut enviar el correu %s (%s, smtp %s)",
        qual,
        type(exc).__name__,
        code,
    )


def _smtp_codes(exc: BaseException) -> str | None:
    code = getattr(exc, "smtp_code", None)
    if isinstance(code, int):
        return str(code)
    recipients = getattr(exc, "recipients", None)
    if not isinstance(recipients, dict):
        return None
    codes: list[int] = []
    for value in recipients.values():
        if isinstance(value, tuple) and value and isinstance(value[0], int) and value[0] not in codes:
            codes.append(value[0])
    if not codes:
        return None
    return ",".join(str(item) for item in codes)
