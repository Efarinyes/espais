"""Registra el nombre d’assistents d’una reserva pròpia."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.domain.attendance import AttendanceRecord, attendance_flags
from app.domain.errors import ForbiddenError, InvalidAttendanceError, ReservationNotFoundError, SpaceNotFoundError
from app.domain.reservation import Reservation, ReservationStatus
from app.ports.attendance import AttendanceStrategy
from app.ports.identity import Clock, IdGenerator
from app.ports.reservations import ReservationUnitOfWork


@dataclass(frozen=True)
class RecordAttendanceCommand:
    entity_id: UUID
    actor_user_id: UUID
    reservation_id: UUID
    count: int


@dataclass(frozen=True)
class RecordAttendanceResult:
    record: AttendanceRecord
    reservation: Reservation
    space_name: str
    capacity: int
    min_attendance: int | None
    exceeds_capacity: bool
    below_min_attendance: bool


class RecordAttendance:
    def __init__(
        self,
        uow: ReservationUnitOfWork,
        strategy: AttendanceStrategy,
        clock: Clock,
        ids: IdGenerator,
    ) -> None:
        self._uow = uow
        self._strategy = strategy
        self._clock = clock
        self._ids = ids

    def execute(self, command: RecordAttendanceCommand) -> RecordAttendanceResult:
        reservation = self._uow.reservations.get_by_id(command.entity_id, command.reservation_id)
        if reservation is None:
            raise ReservationNotFoundError()
        if reservation.status == ReservationStatus.CANCELLED:
            raise InvalidAttendanceError("no es pot registrar assistència d’una reserva anul·lada")
        if reservation.coordinator_id != command.actor_user_id:
            raise ForbiddenError("només qui ha fet la reserva pot registrar-ne l’assistència")

        space = self._uow.spaces.get_by_id(command.entity_id, reservation.space_id)
        if space is None:
            raise SpaceNotFoundError()

        value = self._strategy.apply(command.count)
        existing = self._uow.attendance.get_by_reservation_id(command.entity_id, reservation.id)
        record = AttendanceRecord(
            id=existing.id if existing is not None else self._ids.new(),
            entity_id=command.entity_id,
            reservation_id=reservation.id,
            strategy=value.strategy,
            count=value.count,
            recorded_at=self._clock.now(),
        )
        exceeds, below = attendance_flags(record.count, space.capacity, space.min_attendance)
        try:
            self._uow.attendance.save(record)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return RecordAttendanceResult(
            record=record,
            reservation=reservation,
            space_name=space.name,
            capacity=space.capacity,
            min_attendance=space.min_attendance,
            exceeds_capacity=exceeds,
            below_min_attendance=below,
        )
