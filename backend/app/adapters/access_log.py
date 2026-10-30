"""El log d’accés d’uvicorn no guarda el token d’invitació que l’API porta al camí."""

from __future__ import annotations

import logging
import re

_TOKEN_INVITACIO = re.compile(r"(/invitacions/)[^/?#\s]+")


class AmagaTokenInvitacio(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple):
            record.args = tuple(
                _TOKEN_INVITACIO.sub(r"\1<token>", arg) if isinstance(arg, str) else arg for arg in record.args
            )
        return True


def protegeix_log_acces() -> None:
    logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(f, AmagaTokenInvitacio) for f in logger.filters):
        logger.addFilter(AmagaTokenInvitacio())
