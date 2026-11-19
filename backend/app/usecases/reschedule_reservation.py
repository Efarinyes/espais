"""Canvi d’horari d’una reserva: el responsable avisa; el coordinador només la seva."""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from datetime import datetime
from uuid import UUID

from app.domain.authorization import (
    Accio,
    exigir_recurs_propi,
    exigir_reserva_no_gestionada,
)
from app.domain.errors import (
    InvalidReservationError,
    ReservationNotFoundError,
    ReservationOverlapError,
    SpaceNotFoundError,
)
from app.domain.identity import MembershipRole
from app.domain.notification import (
    Notification,
    NotificationPayload,
    NotificationType,
    reservation_changes,
)
from app.domain.reservation import (
    Reservation,
    ReservationStatus,
    as_utc,
    validate_interval_order,
    validate_reservable_interval,
)
from app.ports.identity import Clock, IdGenerator
from app.ports.notifications import Notifier
from app.ports.reservations import ReservationUnitOfWork
from app.usecases.mail_failure import log_mail_failure

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
        validate_interval_order(starts_at, ends_at)

        reservation = self._uow.reservations.get_by_id(command.entity_id, command.reservation_id)
        if reservation is None:
            raise ReservationNotFoundError()
        if reservation.status == ReservationStatus.CANCELLED:
            raise InvalidReservationError("no es pot reprogramar una reserva anul·lada")

        exigir_recurs_propi(
            command.actor_role,
            Accio.REPROGRAMAR,
            propi=reservation.coordinator_id == command.actor_user_id,
        )
        exigir_reserva_no_gestionada(
            command.actor_role, gestionada=reservation.managed_by_responsible
        )
        es_responsable = command.actor_role == MembershipRole.RESPONSIBLE

        space = self._uow.spaces.get_by_id(command.entity_id, reservation.space_id)
        if space is None:
            raise SpaceNotFoundError()
        validate_reservable_interval(
            starts_at, ends_at, active=space.active, windows=space.windows
        )

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

        changes = reservation_changes(
            reservation.starts_at, reservation.ends_at, starts_at, ends_at
        )
        if es_responsable and not changes:
            # Sense canvi real no hi ha res a notificar ni res a posar sota control del responsable.
            return RescheduleReservationResult(
                reservation=reservation,
                notification=None,
                space_name=space.name,
                capacity=space.capacity,
                min_attendance=space.min_attendance,
            )

        moved = replace(
            reservation,
            starts_at=starts_at,
            ends_at=ends_at,
            managed_by_responsible=reservation.managed_by_responsible or es_responsable,
        )
        notification = None
        if es_responsable and reservation.coordinator_id != command.actor_user_id:
            notification = Notification(
                id=self._ids.new(),
                entity_id=command.entity_id,
                user_id=reservation.coordinator_id,
                reservation_id=reservation.id,
                type=NotificationType.RESERVATION_RESCHEDULED,
                payload=NotificationPayload(
                    entity_name=command.entity_name,
                    space_name=space.name,
                    space_id=str(space.id),
                    starts_at=reservation.starts_at.isoformat(),
                    ends_at=reservation.ends_at.isoformat(),
                    responsible_name=command.actor_name,
                    reason=_reason(command.reason),
                    new_starts_at=starts_at.isoformat(),
                    new_ends_at=ends_at.isoformat(),
                    changes=changes,
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
            except Exception as exc:  # noqa: BLE001
                log_mail_failure(logger, "de reprogramació", exc)
        return RescheduleReservationResult(
            reservation=moved,
            notification=notification,
            space_name=space.name,
            capacity=space.capacity,
            min_attendance=space.min_attendance,
        )
