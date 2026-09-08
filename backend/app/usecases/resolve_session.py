"""Llegeix la sessió des de la membership a la BD. No confia l’entity_id del token."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.domain.errors import SessionNotFoundError
from app.domain.identity import MembershipRole
from app.ports.identity import IdentityUnitOfWork


@dataclass(frozen=True)
class SessionView:
    user_id: UUID
    entity_id: UUID
    role: MembershipRole
    entity_name: str
    user_name: str
    typology: str | None


class ResolveSession:
    def __init__(self, uow: IdentityUnitOfWork) -> None:
        self._uow = uow

    def execute(self, user_id: UUID) -> SessionView:
        user = self._uow.users.get_by_id(user_id)
        membership = self._uow.memberships.get_by_user_id(user_id)
        if user is None or membership is None:
            raise SessionNotFoundError()
        entity = self._uow.entities.get_by_id(membership.entity_id)
        if entity is None:
            raise SessionNotFoundError()
        return SessionView(
            user_id=user.id,
            entity_id=entity.id,
            role=membership.role,
            entity_name=entity.name,
            user_name=user.name,
            typology=entity.typology,
        )
