"""Revocació en memòria per als tests del cas d’ús."""

from __future__ import annotations

from datetime import datetime


class InMemoryRevocationUnitOfWork:
    def __init__(self) -> None:
        self._rows: dict[str, datetime] = {}
        self.revoked_tokens = self

    def add(self, token_hash: str, expires_at: datetime) -> None:
        self._rows.setdefault(token_hash, expires_at)

    def contains(self, token_hash: str) -> bool:
        return token_hash in self._rows

    def purge_expired(self, now: datetime) -> int:
        expired = [key for key, exp in self._rows.items() if exp < now]
        for key in expired:
            del self._rows[key]
        return len(expired)

    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        return None
