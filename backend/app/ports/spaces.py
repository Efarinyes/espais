"""Ports d’espais: persistència acotada a entity_id."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.domain.space import Space


class SpaceRepository(Protocol):
    def add(self, space: Space) -> None: ...

    def list_by_entity_id(self, entity_id: UUID) -> list[Space]: ...

    def get_by_normalized_name(self, entity_id: UUID, name_normalized: str) -> Space | None: ...

    def get_by_id(self, entity_id: UUID, space_id: UUID) -> Space | None: ...

    def save(self, space: Space) -> None: ...


class SpaceUnitOfWork(Protocol):
    spaces: SpaceRepository

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
