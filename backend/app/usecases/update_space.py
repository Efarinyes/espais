"""Edició d’un espai de l’entitat. Desactivar no esborra l’historial."""

from __future__ import annotations

from dataclasses import dataclass, replace
from uuid import UUID

from app.domain.errors import DuplicateSpaceNameError, ForbiddenError, SpaceNotFoundError
from app.domain.identity import MembershipRole
from app.domain.space import (
    AvailabilityWindow,
    Space,
    normalize_space_name,
    validate_space_fields,
    validate_windows,
)
from app.ports.spaces import SpaceUnitOfWork


@dataclass(frozen=True)
class UpdateSpaceCommand:
    entity_id: UUID
    space_id: UUID
    actor_role: MembershipRole
    name: str
    capacity: int
    equipment: str | None = None
    active: bool = True
    windows: tuple[AvailabilityWindow, ...] | None = None


@dataclass(frozen=True)
class UpdateSpaceResult:
    space: Space


class UpdateSpace:
    def __init__(self, uow: SpaceUnitOfWork) -> None:
        self._uow = uow

    def execute(self, command: UpdateSpaceCommand) -> UpdateSpaceResult:
        if command.actor_role != MembershipRole.RESPONSIBLE:
            raise ForbiddenError("només el responsable pot definir espais")

        space = self._uow.spaces.get_by_id(command.entity_id, command.space_id)
        if space is None:
            raise SpaceNotFoundError()

        name, capacity, equipment = validate_space_fields(
            command.name, command.capacity, command.equipment
        )

        needle = normalize_space_name(name)
        existing = self._uow.spaces.get_by_normalized_name(command.entity_id, needle)
        if existing is not None and existing.id != space.id:
            raise DuplicateSpaceNameError(name)

        windows = validate_windows(command.windows) if command.windows is not None else space.windows
        updated = replace(
            space,
            name=name,
            capacity=capacity,
            equipment=equipment,
            active=command.active,
            windows=windows,
        )
        try:
            self._uow.spaces.save(updated)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return UpdateSpaceResult(space=updated)
