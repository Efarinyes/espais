"""Reptes de login vius al procés. Un worker, sense Redis (ADR 0012 i 0025)."""

from __future__ import annotations

import threading
from datetime import datetime
from uuid import UUID

from app.domain.errors import (
    InvalidLoginCodeError,
    LoginChallengeClosedError,
    LoginRateLimitedError,
)
from app.domain.login_verification import (
    CODE_TTL,
    WINDOW,
    LoginChallenge,
    apply_code,
    blind,
    rate_reason,
    supersede,
)


class LoginChallengeStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._rows: dict[UUID, LoginChallenge] = {}
        self._issues: list[tuple[datetime, str, str]] = []

    def open(
        self,
        *,
        challenge_id: UUID,
        user_id: UUID,
        channel: str,
        ip: str,
        code: str,
        now: datetime,
    ) -> datetime:
        channel_hash = blind(channel)
        ip_hash = blind(ip.strip() or "desconeguda")
        expires_at = now + CODE_TTL
        with self._lock:
            self._issues = [item for item in self._issues if now - item[0] < WINDOW]
            reason = rate_reason(self._issues, now, channel_hash, ip_hash)
            if reason is not None:
                raise LoginRateLimitedError(reason)
            supersede(list(self._rows.values()), channel_hash, now)
            self._rows[challenge_id] = LoginChallenge(
                id=challenge_id,
                user_id=user_id,
                channel_hash=channel_hash,
                code_hash=blind(code),
                expires_at=expires_at,
            )
            self._issues.append((now, channel_hash, ip_hash))
        return expires_at

    def drop(self, challenge_id: UUID) -> None:
        with self._lock:
            self._rows.pop(challenge_id, None)

    def consume(self, *, challenge_id: UUID, channel: str, code: str, now: datetime) -> UUID:
        with self._lock:
            row = self._rows.get(challenge_id)
            if row is None:
                raise LoginChallengeClosedError("channel")
            error = apply_code(row, blind(channel), blind(code), now)
            if error == "invalid":
                raise InvalidLoginCodeError()
            if error is not None:
                raise LoginChallengeClosedError(error)
            return row.user_id

    def invalidate_channel(self, channel: str, now: datetime, outcome: str) -> None:
        channel_hash = blind(channel)
        with self._lock:
            for row in self._rows.values():
                if row.channel_hash == channel_hash and row.closed_at is None:
                    row.closed_at = now
                    row.outcome = outcome
