"""Recuperació de compte. Sense I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class PasswordReset:
    id: UUID
    user_id: UUID
    token_hash: str
    expires_at: datetime
    used_at: datetime | None
    created_at: datetime


@dataclass(frozen=True)
class RecoveryAttempt:
    id: UUID
    subject_hash: str
    ip_hash: str
    created_at: datetime
