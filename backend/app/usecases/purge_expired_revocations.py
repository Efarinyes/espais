"""Esborra revocacions amb exp ja vençuda. No usa la retenció de 21 dies dels avisos."""

from __future__ import annotations

from dataclasses import dataclass

from app.ports.identity import Clock
from app.ports.revocation import RevocationUnitOfWork


@dataclass(frozen=True)
class PurgeExpiredRevocationsResult:
    deleted: int


class PurgeExpiredRevocations:
    def __init__(self, uow: RevocationUnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    def execute(self) -> PurgeExpiredRevocationsResult:
        try:
            deleted = self._uow.revoked_tokens.purge_expired(self._clock.now())
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return PurgeExpiredRevocationsResult(deleted=deleted)
