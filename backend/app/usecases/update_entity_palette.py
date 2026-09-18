"""El responsable desa la paleta de colors de l’entitat. Llista tancada."""

from __future__ import annotations

from dataclasses import dataclass, replace
from uuid import UUID

from app.domain.errors import ForbiddenError, InvalidPaletteError, SessionNotFoundError
from app.domain.identity import ENTITY_PALETTES, MembershipRole
from app.ports.identity import IdentityUnitOfWork


@dataclass(frozen=True)
class UpdateEntityPaletteCommand:
    entity_id: UUID
    actor_role: MembershipRole
    palette: str


@dataclass(frozen=True)
class UpdateEntityPaletteResult:
    palette: str


class UpdateEntityPalette:
    def __init__(self, uow: IdentityUnitOfWork) -> None:
        self._uow = uow

    def execute(self, command: UpdateEntityPaletteCommand) -> UpdateEntityPaletteResult:
        if command.actor_role != MembershipRole.RESPONSIBLE:
            raise ForbiddenError("només el responsable pot canviar els colors de l’entitat")

        palette = command.palette.strip()
        if palette not in ENTITY_PALETTES:
            raise InvalidPaletteError("aquesta paleta no és vàlida")

        entity = self._uow.entities.get_by_id(command.entity_id)
        if entity is None:
            raise SessionNotFoundError()

        updated = replace(entity, palette=palette)
        try:
            self._uow.entities.save(updated)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return UpdateEntityPaletteResult(palette=palette)
