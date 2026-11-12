"""El responsable llegeix els coordinadors de la seva entitat. Sense correu."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.domain.errors import ForbiddenError
from app.domain.identity import MembershipRole
from app.ports.identity import IdentityUnitOfWork


@dataclass(frozen=True)
class ListEntityCoordinatorsQuery:
    entity_id: UUID
    actor_role: MembershipRole


@dataclass(frozen=True)
class CoordinatorListItem:
    id: UUID
    name: str


class ListEntityCoordinators:
    def __init__(self, uow: IdentityUnitOfWork) -> None:
        self._uow = uow

    def execute(self, query: ListEntityCoordinatorsQuery) -> list[CoordinatorListItem]:
        if query.actor_role != MembershipRole.RESPONSIBLE:
            raise ForbiddenError("només el responsable pot veure els coordinadors")
        items: list[CoordinatorListItem] = []
        for membership in self._uow.memberships.list_by_entity_id(query.entity_id):
            if membership.role != MembershipRole.COORDINATOR:
                continue
            user = self._uow.users.get_by_id(membership.user_id)
            if user is None:
                continue
            items.append(CoordinatorListItem(id=user.id, name=user.name))
        items.sort(key=lambda item: (item.name.casefold(), str(item.id)))
        return items
