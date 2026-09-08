"""Rellotge i UUID de producció (injectats al cas d’ús)."""

from datetime import UTC, datetime
from secrets import token_urlsafe
from uuid import UUID, uuid4


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


class UuidIdGenerator:
    def new(self) -> UUID:
        return uuid4()


class SecretsInvitationTokenGenerator:
    def new(self) -> str:
        return token_urlsafe(32)
