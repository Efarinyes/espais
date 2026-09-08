"""Alta d’un espai de l’entitat. Nom únic per entity_id, no global."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.domain.errors import DuplicateSpaceNameError, ForbiddenError, InvalidSpaceError
from app.domain.identity import MembershipRole
from app.domain.space import AvailabilityWindow, Space, default_week_windows, validate_windows
from app.ports.identity import Clock, IdGenerator
from app.ports.spaces import SpaceUnitOfWork


def normalize_space_name(name: str) -> str:
    return name.strip().casefold()


@dataclass(frozen=True)
class CreateSpaceCommand:
    entity_id: UUID
    actor_role: MembershipRole
    name: str
    capacity: int
    equipment: str | None = None
    windows: tuple[AvailabilityWindow, ...] | None = None


@dataclass(frozen=True)
class CreateSpaceResult:
    space: Space


class CreateSpace:
    def __init__(self, uow: SpaceUnitOfWork, clock: Clock, ids: IdGenerator) -> None:
        self._uow = uow
        self._clock = clock
        self._ids = ids

    def execute(self, command: CreateSpaceCommand) -> CreateSpaceResult:
        if command.actor_role != MembershipRole.RESPONSIBLE:
            raise ForbiddenError("només el responsable pot definir espais")

        name = command.name.strip()
        if not name:
            raise InvalidSpaceError("el nom de l’espai és obligatori")
        if command.capacity < 1:
            raise InvalidSpaceError("l’aforament ha de ser un enter positiu")

        equipment = command.equipment.strip() if command.equipment else None
        if equipment == "":
            equipment = None

        windows = validate_windows(command.windows if command.windows is not None else default_week_windows())
        needle = normalize_space_name(name)
        if self._uow.spaces.get_by_normalized_name(command.entity_id, needle) is not None:
            raise DuplicateSpaceNameError(name)

        space = Space(
            id=self._ids.new(),
            entity_id=command.entity_id,
            name=name,
            capacity=command.capacity,
            equipment=equipment,
            min_attendance=None,
            active=True,
            created_at=self._clock.now(),
            windows=windows,
        )
        try:
            self._uow.spaces.add(space)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return CreateSpaceResult(space=space)
