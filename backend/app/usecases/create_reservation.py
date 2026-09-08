"""Crea una reserva confirmada si cap dins finestres i no solapa."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.errors import InvalidReservationError, ReservationOverlapError, SpaceNotFoundError
from app.domain.identity import MembershipRole
from app.domain.reservation import (
    Reservation,
    ReservationStatus,
    as_utc,
    interval_fits_windows,
)
from app.ports.identity import Clock, IdGenerator
from app.ports.reservations import ReservationUnitOfWork


@dataclass(frozen=True)
class CreateReservationCommand:
    entity_id: UUID
    actor_user_id: UUID
    actor_role: MembershipRole
    actor_name: str
    space_id: UUID
    starts_at: datetime
    ends_at: datetime
    notes: str | None = None


@dataclass(frozen=True)
class CreateReservationResult:
    reservation: Reservation
    space_name: str


class CreateReservation:
    def __init__(self, uow: ReservationUnitOfWork, clock: Clock, ids: IdGenerator) -> None:
        self._uow = uow
        self._clock = clock
        self._ids = ids

    def execute(self, command: CreateReservationCommand) -> CreateReservationResult:
        starts_at = as_utc(command.starts_at)
        ends_at = as_utc(command.ends_at)
        if starts_at >= ends_at:
            raise InvalidReservationError("l’hora d’inici ha de ser anterior a la de fi")

        space = self._uow.spaces.get_by_id(command.entity_id, command.space_id)
        if space is None:
            raise SpaceNotFoundError()
        if not space.active:
            raise InvalidReservationError("aquest espai no està actiu")
        if not interval_fits_windows(starts_at, ends_at, space.windows):
            raise InvalidReservationError("l’interval queda fora de l’horari de l’espai")

        overlapping = self._uow.reservations.list_overlapping(
            command.entity_id,
            command.space_id,
            starts_at,
            ends_at,
        )
        if overlapping:
            raise ReservationOverlapError()

        notes = command.notes.strip() if command.notes else None
        if notes == "":
            notes = None

        reservation = Reservation(
            id=self._ids.new(),
            entity_id=command.entity_id,
            space_id=command.space_id,
            coordinator_id=command.actor_user_id,
            coordinator_name=command.actor_name.strip() or "Coordinador",
            starts_at=starts_at,
            ends_at=ends_at,
            status=ReservationStatus.CONFIRMED,
            notes=notes,
            created_at=self._clock.now(),
        )
        try:
            self._uow.reservations.add(reservation)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return CreateReservationResult(reservation=reservation, space_name=space.name)
