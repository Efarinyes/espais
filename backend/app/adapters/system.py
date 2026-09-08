"""Rellotge i UUID de producció (injectats al cas d’ús)."""

from datetime import UTC, datetime
from uuid import UUID, uuid4


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


class UuidIdGenerator:
    def new(self) -> UUID:
        return uuid4()
