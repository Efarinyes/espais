"""Registra o substitueix una reserva: el responsable anul·la i n’avisa el coordinador."""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from uuid import UUID

from app.domain.errors import (
    ForbiddenError,
    InvalidCancellationError,
    ReservationNotFoundError,
    SpaceNotFoundError,
)
from app.domain.identity import MembershipRole
from app.domain.notification import Notification, NotificationPayload, NotificationType
from app.domain.reservation import Reservation, ReservationStatus
from app.ports.identity import Clock, IdGenerator
from app.ports.notifications import Notifier
from app.ports.reservations import ReservationUnitOfWork

logger = logging.getLogger("espais.notifier")


@dataclass(frozen=True)
class CancelReservationByResponsibleCommand:
    entity_id: UUID
    actor_user_id: UUID
    actor_role: MembershipRole
    actor_name: str
    entity_name: str
    reservation_id: UUID
    reason: str | None = None


@dataclass(frozen=True)
class CancelReservationByResponsibleResult:
    reservation: Reservation
    notification: Notification
    space_name: str
    capacity: int
    min_attendance: int | None


def _reason(raw: str | None) -> str | None:
    if raw is None:
        return None
    text = raw.strip()
    return text or None


class CancelReservationByResponsible:
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

    def execute(self, command: CancelReservationByResponsibleCommand) -> CancelReservationByResponsibleResult:
        if command.actor_role != MembershipRole.RESPONSIBLE:
            raise ForbiddenError("només el responsable pot anul·lar una reserva amb avís al coordinador")

        reservation = self._uow.reservations.get_by_id(command.entity_id, command.reservation_id)
        if reservation is None:
            raise ReservationNotFoundError()
        if reservation.status == ReservationStatus.CANCELLED:
            raise InvalidCancellationError("aquesta reserva ja està anul·lada")

        space = self._uow.spaces.get_by_id(command.entity_id, reservation.space_id)
        if space is None:
            raise SpaceNotFoundError()

        cancelled = replace(reservation, status=ReservationStatus.CANCELLED)
        notification = Notification(
            id=self._ids.new(),
            entity_id=command.entity_id,
            user_id=reservation.coordinator_id,
            reservation_id=reservation.id,
            type=NotificationType.RESERVATION_CANCELLED,
            payload=NotificationPayload(
                entity_name=command.entity_name,
                space_name=space.name,
                starts_at=reservation.starts_at.isoformat(),
                ends_at=reservation.ends_at.isoformat(),
                responsible_name=command.actor_name,
                reason=_reason(command.reason),
            ),
            created_at=self._clock.now(),
        )
        try:
            self._uow.reservations.save(cancelled)
            self._uow.notifications.add(notification)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        try:
            self._notifier.send(notification)
        except Exception:
            logger.exception("no s’ha pogut enviar el correu d’anul·lació")
        return CancelReservationByResponsibleResult(
            reservation=cancelled,
            notification=notification,
            space_name=space.name,
            capacity=space.capacity,
            min_attendance=space.min_attendance,
        )
