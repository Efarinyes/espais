"""Llegeix una invitació pendent per mostrar-la abans d’acceptar."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.errors import InvitationNotFoundError
from app.domain.invitation import require_pending
from app.ports.identity import Clock, IdentityUnitOfWork


@dataclass(frozen=True)
class GetInvitationResult:
    email: str
    entity_name: str


class GetInvitation:
    def __init__(self, uow: IdentityUnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    def execute(self, token: str) -> GetInvitationResult:
        invitation = require_pending(
            self._uow.invitations.get_by_token(token.strip()),
            self._clock.now(),
        )
        entity = self._uow.entities.get_by_id(invitation.entity_id)
        if entity is None:
            raise InvitationNotFoundError()
        return GetInvitationResult(email=invitation.email, entity_name=entity.name)
