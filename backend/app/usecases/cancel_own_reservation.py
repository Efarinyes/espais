"""El coordinador anul·la la seva reserva. Sense avís al responsable."""

from __future__ import annotations

from dataclasses import dataclass, replace
from uuid import UUID

from app.domain.errors import (
    ForbiddenError,
    InvalidCancellationError,
    ReservationNotFoundError,
    SpaceNotFoundError,
)
from app.domain.identity import MembershipRole
from app.domain.reservation import Reservation, ReservationStatus
from app.ports.reservations import ReservationUnitOfWork


@dataclass(frozen=True)
class CancelOwnReservationCommand:
    entity_id: UUID
    actor_user_id: UUID
    actor_role: MembershipRole
    reservation_id: UUID


@dataclass(frozen=True)
class CancelOwnReservationResult:
    reservation: Reservation
    space_name: str
    capacity: int
    min_attendance: int | None


class CancelOwnReservation:
    def __init__(self, uow: ReservationUnitOfWork) -> None:
        self._uow = uow

    def execute(self, command: CancelOwnReservationCommand) -> CancelOwnReservationResult:
        if command.actor_role != MembershipRole.COORDINATOR:
            raise ForbiddenError("només el coordinador pot anul·lar la seva reserva")

        reservation = self._uow.reservations.get_by_id(command.entity_id, command.reservation_id)
        if reservation is None:
            raise ReservationNotFoundError()
        if reservation.coordinator_id != command.actor_user_id:
            raise ForbiddenError("només pots anul·lar les teves reserves")
        if reservation.status == ReservationStatus.CANCELLED:
            raise InvalidCancellationError("aquesta reserva ja està anul·lada")

        space = self._uow.spaces.get_by_id(command.entity_id, reservation.space_id)
        if space is None:
            raise SpaceNotFoundError()

        cancelled = replace(reservation, status=ReservationStatus.CANCELLED)
        try:
            self._uow.reservations.save(cancelled)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return CancelOwnReservationResult(
            reservation=cancelled,
            space_name=space.name,
            capacity=space.capacity,
            min_attendance=space.min_attendance,
        )
