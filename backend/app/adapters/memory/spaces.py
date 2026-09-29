"""Adaptador in-memory d’espais (tests)."""

from __future__ import annotations

from uuid import UUID

from app.domain.space import Space, normalize_space_name


class InMemorySpaceRepository:
    def __init__(self, uow: InMemorySpaceUnitOfWork) -> None:
        self._uow = uow

    def add(self, space: Space) -> None:
        self._uow._working.append(space)

    def list_by_entity_id(self, entity_id: UUID) -> list[Space]:
        return [space for space in self._uow._working if space.entity_id == entity_id]

    def get_by_normalized_name(self, entity_id: UUID, name_normalized: str) -> Space | None:
        for space in self._uow._working:
            if space.entity_id == entity_id and normalize_space_name(space.name) == name_normalized:
                return space
        return None

    def get_by_id(self, entity_id: UUID, space_id: UUID) -> Space | None:
        for space in self._uow._working:
            if space.entity_id == entity_id and space.id == space_id:
                return space
        return None

    def save(self, space: Space) -> None:
        for index, existing in enumerate(self._uow._working):
            if existing.id == space.id and existing.entity_id == space.entity_id:
                self._uow._working[index] = space
                return


class InMemorySpaceUnitOfWork:
    def __init__(self) -> None:
        self._committed: list[Space] = []
        self._working: list[Space] = []
        self.spaces = InMemorySpaceRepository(self)

    def commit(self) -> None:
        self._committed = list(self._working)

    def rollback(self) -> None:
        self._working = list(self._committed)
