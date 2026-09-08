"""Llista reserves d’un interval, acotades a entity_id. El nom només si toca."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.identity import MembershipRole
from app.domain.reservation import ReservationStatus, as_utc
from app.ports.reservations import ReservationUnitOfWork


@dataclass(frozen=True)
class ListReservationsQuery:
    entity_id: UUID
    actor_user_id: UUID
    actor_role: MembershipRole
    starts_at: datetime
    ends_at: datetime
    space_id: UUID | None = None


@dataclass(frozen=True)
class ReservationListItem:
    id: UUID
    space_id: UUID
    space_name: str
    starts_at: datetime
    ends_at: datetime
    status: ReservationStatus
    mine: bool
    coordinator_name: str | None


class ListReservations:
    def __init__(self, uow: ReservationUnitOfWork) -> None:
        self._uow = uow

    def execute(self, query: ListReservationsQuery) -> list[ReservationListItem]:
        starts_at = as_utc(query.starts_at)
        ends_at = as_utc(query.ends_at)
        reservations = self._uow.reservations.list_in_range(
            query.entity_id,
            starts_at,
            ends_at,
            query.space_id,
        )
        spaces = {space.id: space for space in self._uow.spaces.list_by_entity_id(query.entity_id)}
        items: list[ReservationListItem] = []
        for reservation in reservations:
            if reservation.status != ReservationStatus.CONFIRMED:
                continue
            space = spaces.get(reservation.space_id)
            if space is None:
                continue
            mine = reservation.coordinator_id == query.actor_user_id
            show_name = query.actor_role == MembershipRole.RESPONSIBLE or mine
            items.append(
                ReservationListItem(
                    id=reservation.id,
                    space_id=reservation.space_id,
                    space_name=space.name,
                    starts_at=reservation.starts_at,
                    ends_at=reservation.ends_at,
                    status=reservation.status,
                    mine=mine,
                    coordinator_name=reservation.coordinator_name if show_name else None,
                )
            )
        return items
