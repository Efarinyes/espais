"""Ports del repte de login. El cas d’ús no coneix Socket.IO ni el magatzem concret."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID


class LoginChannel(Protocol):
    def live(self, channel: str) -> bool: ...

    def reserve(self, channel: str, challenge_id: UUID, code: str, expires_at: datetime) -> bool: ...

    def clear(self, channel: str) -> None: ...


class LoginChallenges(Protocol):
    def open(
        self,
        *,
        challenge_id: UUID,
        user_id: UUID,
        channel: str,
        ip: str,
        code: str,
        now: datetime,
    ) -> datetime: ...

    def drop(self, challenge_id: UUID) -> None: ...

    def consume(self, *, challenge_id: UUID, channel: str, code: str, now: datetime) -> UUID: ...
