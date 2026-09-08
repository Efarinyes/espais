"""Consulta d’un espai de l’entitat. Sempre filtra per entity_id."""

from __future__ import annotations

from uuid import UUID

from app.domain.errors import SpaceNotFoundError
from app.domain.space import Space
from app.ports.spaces import SpaceUnitOfWork


class GetSpace:
    def __init__(self, uow: SpaceUnitOfWork) -> None:
        self._uow = uow

    def execute(self, entity_id: UUID, space_id: UUID) -> Space:
        space = self._uow.spaces.get_by_id(entity_id, space_id)
        if space is None:
            raise SpaceNotFoundError()
        return space
