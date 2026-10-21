"""Revocació d’un Bearer. No és part del model d’entitat, usuari o membership."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol


class RevokedTokenRepository(Protocol):
    def add(self, token_hash: str, expires_at: datetime) -> None: ...

    def contains(self, token_hash: str) -> bool: ...

    def purge_expired(self, now: datetime) -> int: ...


class RevocationUnitOfWork(Protocol):
    revoked_tokens: RevokedTokenRepository

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
