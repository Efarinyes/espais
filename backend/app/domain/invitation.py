"""Invitació de coordinador. Sense I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.errors import InvitationAcceptedError, InvitationExpiredError, InvitationNotFoundError


@dataclass(frozen=True)
class Invitation:
    id: UUID
    entity_id: UUID
    email: str
    token: str
    expires_at: datetime
    accepted_at: datetime | None
    created_at: datetime


def require_pending(invitation: Invitation | None, now: datetime) -> Invitation:
    if invitation is None:
        raise InvitationNotFoundError()
    if invitation.accepted_at is not None:
        raise InvitationAcceptedError()
    if now >= invitation.expires_at:
        raise InvitationExpiredError()
    return invitation
