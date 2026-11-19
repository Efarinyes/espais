"""Web Push amb VAPID (RFC 8030, 8291 i 8292) sobre pywebpush.

Variables d’entorn:
- ESPAIS_VAPID_PRIVATE_KEY: clau privada VAPID en base64url (32 bytes). Secret.
- ESPAIS_VAPID_SUBJECT: `mailto:` o `https://` de qui opera el servidor.
- ESPAIS_PUSH_EXTRA_HOSTS: sufixos de host de push admesos a més dels per defecte (opcional).

La clau pública es calcula de la privada: no es pot desquadrar. Mai es registra cap
endpoint, clau ni cos de resposta del servei de push.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid, b64urlencode
from pywebpush import WebPushException, webpush

from app.domain.errors import PushDeliveryError, PushSubscriptionExpiredError
from app.domain.notification_text import PushMessage
from app.domain.push import DEFAULT_PUSH_HOST_SUFFIXES, PushSubscription

logger = logging.getLogger("espais.push")

PUSH_TTL_SECONDS = 24 * 60 * 60
PUSH_TIMEOUT_SECONDS = 8


@dataclass(frozen=True)
class VapidConfig:
    private_key: str
    subject: str
    public_key: str


def public_key_of(private_key: str) -> str:
    vapid = Vapid.from_string(private_key=private_key)
    raw = vapid.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return b64urlencode(raw)


def vapid_config_from_env() -> VapidConfig | None:
    private_key = os.environ.get("ESPAIS_VAPID_PRIVATE_KEY", "").strip()
    subject = os.environ.get("ESPAIS_VAPID_SUBJECT", "").strip()
    if not private_key and not subject:
        return None
    if not private_key or not subject:
        logger.error("Web Push desactivat: falta ESPAIS_VAPID_PRIVATE_KEY o ESPAIS_VAPID_SUBJECT")
        return None
    if not subject.startswith(("mailto:", "https://")):
        logger.error("Web Push desactivat: ESPAIS_VAPID_SUBJECT ha de ser mailto: o https://")
        return None
    try:
        public_key = public_key_of(private_key)
    except Exception as exc:  # noqa: BLE001
        logger.error("Web Push desactivat: clau VAPID invàlida (%s)", type(exc).__name__)
        return None
    return VapidConfig(private_key=private_key, subject=subject, public_key=public_key)


def push_host_suffixes_from_env() -> tuple[str, ...]:
    extra = tuple(
        item.strip().lower().lstrip(".")
        for item in os.environ.get("ESPAIS_PUSH_EXTRA_HOSTS", "").split(",")
        if item.strip()
    )
    return DEFAULT_PUSH_HOST_SUFFIXES + extra


class PywebpushGateway:
    def __init__(self, config: VapidConfig) -> None:
        self._subject = config.subject
        self._vapid = Vapid.from_string(private_key=config.private_key)

    def send(self, subscription: PushSubscription, message: PushMessage) -> None:
        data = json.dumps(
            {
                "title": message.title,
                "body": message.body,
                "url": message.url,
                "tag": message.tag,
            },
            ensure_ascii=False,
        )
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=data,
                vapid_private_key=self._vapid,
                vapid_claims={"sub": self._subject},
                ttl=PUSH_TTL_SECONDS,
                timeout=PUSH_TIMEOUT_SECONDS,
            )
        except WebPushException as exc:
            status = exc.status_code
            if status in (404, 410):
                raise PushSubscriptionExpiredError() from None
            raise PushDeliveryError(f"status {status}") from None
        except Exception as exc:  # noqa: BLE001
            raise PushDeliveryError(type(exc).__name__) from None
