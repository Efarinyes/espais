"""El responsable consulta els avisos enviats i si el coordinador els ha llegit."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.authorization import Accio, exigir_rol
from app.domain.identity import MembershipRole
from app.domain.notification import NotificationType
from app.domain.reservation import ReservationStatus
from app.ports.reservations import ReservationUnitOfWork

SENT_NOTICES_LIMIT = 100


@dataclass(frozen=True)
class ListSentNotificationsQuery:
    entity_id: UUID
    actor_role: MembershipRole


@dataclass(frozen=True)
class SentNotificationItem:
    id: UUID
    type: NotificationType
    reservation_id: UUID
    coordinator_name: str
    space_name: str
    starts_at: str
    ends_at: str
    new_starts_at: str | None
    new_ends_at: str | None
    changes: tuple[str, ...]
    reservation_status: ReservationStatus | None
    created_at: datetime
    read_at: datetime | None


class ListSentNotifications:
    def __init__(self, uow: ReservationUnitOfWork) -> None:
        self._uow = uow

    def execute(self, query: ListSentNotificationsQuery) -> list[SentNotificationItem]:
        exigir_rol(query.actor_role, Accio.VEURE_AVISOS_ENVIATS)
        items: list[SentNotificationItem] = []
        for notification in self._uow.notifications.list_recent(query.entity_id, SENT_NOTICES_LIMIT):
            reservation = self._uow.reservations.get_by_id(
                query.entity_id, notification.reservation_id
            )
            payload = notification.payload
            items.append(
                SentNotificationItem(
                    id=notification.id,
                    type=notification.type,
                    reservation_id=notification.reservation_id,
                    coordinator_name=reservation.coordinator_name if reservation else "",
                    space_name=payload.space_name,
                    starts_at=payload.starts_at,
                    ends_at=payload.ends_at,
                    new_starts_at=payload.new_starts_at,
                    new_ends_at=payload.new_ends_at,
                    changes=payload.changes,
                    reservation_status=reservation.status if reservation else None,
                    created_at=notification.created_at,
                    read_at=notification.read_at,
                )
            )
        return items
