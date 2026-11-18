"""Política del codi temporal de login. No fa I/O ni coneix Socket.IO."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta
from hmac import compare_digest
from uuid import UUID

CODE_TTL = timedelta(minutes=2)
MAX_ATTEMPTS = 5
COOLDOWN = timedelta(seconds=15)
MAX_PER_CHANNEL = 8
MAX_PER_IP = 120
WINDOW = timedelta(minutes=10)


def blind(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@dataclass
class LoginChallenge:
    id: UUID
    user_id: UUID
    channel_hash: str
    code_hash: str
    expires_at: datetime
    attempts: int = 0
    closed_at: datetime | None = None
    outcome: str | None = None


def rate_reason(
    issues: list[tuple[datetime, str, str]],
    now: datetime,
    channel_hash: str,
    ip_hash: str,
) -> str | None:
    recent = [item for item in issues if now - item[0] < WINDOW]
    channel_times = [item[0] for item in recent if item[1] == channel_hash]
    if channel_times and now - max(channel_times) < COOLDOWN:
        return "cooldown"
    if len(channel_times) >= MAX_PER_CHANNEL:
        return "channel"
    if sum(1 for item in recent if item[2] == ip_hash) >= MAX_PER_IP:
        return "ip"
    return None


def supersede(rows: list[LoginChallenge], channel_hash: str, now: datetime) -> None:
    for row in rows:
        if row.channel_hash == channel_hash and row.closed_at is None:
            row.closed_at = now
            row.outcome = "superseded"


def apply_code(
    row: LoginChallenge,
    channel_hash: str,
    code_hash: str,
    now: datetime,
) -> str | None:
    """Retorna el motiu de rebuig, o None si el codi queda consumit."""
    if not compare_digest(row.channel_hash, channel_hash):
        return "channel"
    if row.closed_at is not None:
        if row.outcome == "used":
            return "reused"
        return row.outcome or "reused"
    if row.expires_at <= now:
        row.closed_at = now
        row.outcome = "expired"
        return "expired"
    if not compare_digest(row.code_hash, code_hash):
        row.attempts += 1
        if row.attempts >= MAX_ATTEMPTS:
            row.closed_at = now
            row.outcome = "locked"
            return "locked"
        return "invalid"
    row.closed_at = now
    row.outcome = "used"
    return None
