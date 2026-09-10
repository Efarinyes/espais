"""Canvi d’horari d’una reserva: el responsable avisa; el coordinador només la seva."""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from datetime import datetime
from uuid import UUID

from app.domain.errors import (
    ForbiddenError,
    InvalidReservationError,
    ReservationNotFoundError,
    ReservationOverlapError,
    SpaceNotFoundError,
)
from app.domain.identity import MembershipRole
from app.domain.notification import Notification, NotificationPayload, NotificationType
from app.domain.reservation import (
    Reservation,
    ReservationStatus,
    as_utc,
    interval_fits_windows,
)
from app.ports.identity import Clock, IdGenerator
from app.ports.notifications import Notifier
from app.ports.reservations import ReservationUnitOfWork

logger = logging.getLogger("espais.notifier")


@dataclass(frozen=True)
class RescheduleReservationCommand:
    entity_id: UUID
    actor_user_id: UUID
    actor_role: MembershipRole
    actor_name: str
    entity_name: str
    reservation_id: UUID
    starts_at: datetime
    ends_at: datetime
    reason: str | None = None


@dataclass(frozen=True)
class RescheduleReservationResult:
    reservation: Reservation
    notification: Notification | None
    space_name: str
    capacity: int
    min_attendance: int | None


def _reason(raw: str | None) -> str | None:
    if raw is None:
        return None
    text = raw.strip()
    return text or None


class RescheduleReservation:
    def __init__(
        self,
        uow: ReservationUnitOfWork,
        notifier: Notifier,
        clock: Clock,
        ids: IdGenerator,
    ) -> None:
        self._uow = uow
        self._notifier = notifier
        self._clock = clock
        self._ids = ids

    def execute(self, command: RescheduleReservationCommand) -> RescheduleReservationResult:
        starts_at = as_utc(command.starts_at)
        ends_at = as_utc(command.ends_at)
        if starts_at >= ends_at:
            raise InvalidReservationError("l’hora d’inici ha de ser anterior a la de fi")

        reservation = self._uow.reservations.get_by_id(command.entity_id, command.reservation_id)
        if reservation is None:
            raise ReservationNotFoundError()
        if reservation.status == ReservationStatus.CANCELLED:
            raise InvalidReservationError("no es pot reprogramar una reserva anul·lada")

        es_responsable = command.actor_role == MembershipRole.RESPONSIBLE
        es_propia = (
            command.actor_role == MembershipRole.COORDINATOR
            and reservation.coordinator_id == command.actor_user_id
        )
        if not es_responsable and not es_propia:
            raise ForbiddenError("no pots reprogramar aquesta reserva")

        space = self._uow.spaces.get_by_id(command.entity_id, reservation.space_id)
        if space is None:
            raise SpaceNotFoundError()
        if not space.active:
            raise InvalidReservationError("aquest espai no està actiu")
        if not interval_fits_windows(starts_at, ends_at, space.windows):
            raise InvalidReservationError("l’interval queda fora de l’horari de l’espai")

        overlapping = [
            other
            for other in self._uow.reservations.list_overlapping(
                command.entity_id,
                reservation.space_id,
                starts_at,
                ends_at,
            )
            if other.id != reservation.id
        ]
        if overlapping:
            raise ReservationOverlapError()

        moved = replace(reservation, starts_at=starts_at, ends_at=ends_at)
        notification = None
        if es_responsable:
            notification = Notification(
                id=self._ids.new(),
                entity_id=command.entity_id,
                user_id=reservation.coordinator_id,
                reservation_id=reservation.id,
                type=NotificationType.RESERVATION_RESCHEDULED,
                payload=NotificationPayload(
                    entity_name=command.entity_name,
                    space_name=space.name,
                    starts_at=reservation.starts_at.isoformat(),
                    ends_at=reservation.ends_at.isoformat(),
                    responsible_name=command.actor_name,
                    reason=_reason(command.reason),
                    new_starts_at=starts_at.isoformat(),
                    new_ends_at=ends_at.isoformat(),
                ),
                created_at=self._clock.now(),
            )
        try:
            self._uow.reservations.save(moved)
            if notification is not None:
                self._uow.notifications.add(notification)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        if notification is not None:
            try:
                self._notifier.send(notification)
            except Exception:
                logger.exception("no s’ha pogut enviar el correu de reprogramació")
        return RescheduleReservationResult(
            reservation=moved,
            notification=notification,
            space_name=space.name,
            capacity=space.capacity,
            min_attendance=space.min_attendance,
        )
