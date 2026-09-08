"""Token HMAC de sessió (user_id + caducitat). Sense JWT extern."""

from __future__ import annotations

import hashlib
import hmac
import json
from base64 import urlsafe_b64decode, urlsafe_b64encode
from uuid import UUID

from app.ports.identity import Clock

DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7


def _b64url_encode(raw: bytes) -> str:
    return urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(text: str) -> bytes:
    padding = "=" * ((4 - len(text) % 4) % 4)
    return urlsafe_b64decode(text + padding)


class HmacTokenIssuer:
    def __init__(self, secret: str, clock: Clock, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
        if not secret:
            raise ValueError("cal un secret de sessió")
        self._secret = secret.encode("utf-8")
        self._clock = clock
        self._ttl_seconds = ttl_seconds

    def issue(self, user_id: UUID) -> str:
        payload = {
            "sub": str(user_id),
            "exp": int(self._clock.now().timestamp()) + self._ttl_seconds,
        }
        body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        signature = _b64url_encode(hmac.new(self._secret, body.encode("ascii"), hashlib.sha256).digest())
        return f"{body}.{signature}"

    def parse(self, token: str) -> UUID | None:
        try:
            body, signature = token.split(".")
        except ValueError:
            return None
        expected = _b64url_encode(hmac.new(self._secret, body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            return None
        try:
            payload = json.loads(_b64url_decode(body).decode("utf-8"))
            if int(payload["exp"]) < int(self._clock.now().timestamp()):
                return None
            return UUID(payload["sub"])
        except (KeyError, ValueError, json.JSONDecodeError):
            return None
