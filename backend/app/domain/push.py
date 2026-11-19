"""Subscripció Web Push d’un coordinador. Sense I/O."""

from __future__ import annotations

import hashlib
import ipaddress
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlsplit
from uuid import UUID

from app.domain.errors import InvalidPushSubscriptionError

MAX_SUBSCRIPTIONS_PER_USER = 10
MAX_ENDPOINT_LENGTH = 2048
MAX_KEY_LENGTH = 255

# Serveis de push dels navegadors principals (FCM, Mozilla, Apple, Windows). El servidor
# fa una petició a l’endpoint que desa; una llista tancada evita fer-lo servir contra altres hosts.
DEFAULT_PUSH_HOST_SUFFIXES = (
    "googleapis.com",
    "push.services.mozilla.com",
    "push.apple.com",
    "notify.windows.com",
)


@dataclass(frozen=True)
class PushSubscription:
    id: UUID
    entity_id: UUID
    user_id: UUID
    endpoint: str
    p256dh: str
    auth: str
    created_at: datetime


def endpoint_hash(endpoint: str) -> str:
    return hashlib.sha256(endpoint.encode("utf-8")).hexdigest()


def _host_allowed(host: str, suffixes: tuple[str, ...]) -> bool:
    return any(host == suffix or host.endswith(f".{suffix}") for suffix in suffixes)


def validate_push_subscription(
    endpoint: str,
    p256dh: str,
    auth: str,
    *,
    allowed_host_suffixes: tuple[str, ...] = DEFAULT_PUSH_HOST_SUFFIXES,
) -> None:
    if not endpoint or len(endpoint) > MAX_ENDPOINT_LENGTH:
        raise InvalidPushSubscriptionError("l’endpoint de la subscripció no és vàlid")
    parts = urlsplit(endpoint)
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or not host or parts.username or parts.password:
        raise InvalidPushSubscriptionError("l’endpoint ha de ser una adreça https")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise InvalidPushSubscriptionError("l’endpoint no pot ser una adreça IP")
    if not _host_allowed(host, allowed_host_suffixes):
        raise InvalidPushSubscriptionError("l’endpoint no és d’un servei de push admès")
    for key in (p256dh, auth):
        if not key or len(key) > MAX_KEY_LENGTH:
            raise InvalidPushSubscriptionError("les claus de la subscripció no són vàlides")
