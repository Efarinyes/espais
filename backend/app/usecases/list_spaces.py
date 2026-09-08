"""Llista els espais d’una entitat. Sempre filtra per entity_id."""

from __future__ import annotations

from uuid import UUID

from app.domain.space import Space
from app.ports.spaces import SpaceUnitOfWork


class ListSpaces:
    def __init__(self, uow: SpaceUnitOfWork) -> None:
        self._uow = uow

    def execute(self, entity_id: UUID) -> list[Space]:
        return self._uow.spaces.list_by_entity_id(entity_id)
