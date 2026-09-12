"""Llista reserves d’un interval, acotades a entity_id. El nom només si toca."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.attendance import attendance_flags
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
    include_cancelled: bool = False


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
    attendance_count: int | None
    capacity: int
    min_attendance: int | None
    exceeds_capacity: bool
    below_min_attendance: bool


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
        records = self._uow.attendance.list_by_reservation_ids(
            query.entity_id,
            [reservation.id for reservation in reservations],
        )
        items: list[ReservationListItem] = []
        allowed = {ReservationStatus.CONFIRMED}
        if query.include_cancelled:
            allowed.add(ReservationStatus.CANCELLED)
        for reservation in reservations:
            if reservation.status not in allowed:
                continue
            space = spaces.get(reservation.space_id)
            if space is None:
                continue
            mine = reservation.coordinator_id == query.actor_user_id
            show_name = query.actor_role == MembershipRole.RESPONSIBLE or mine
            record = records.get(reservation.id)
            count = record.count if record is not None else None
            exceeds, below = attendance_flags(count, space.capacity, space.min_attendance)
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
                    attendance_count=count,
                    capacity=space.capacity,
                    min_attendance=space.min_attendance,
                    exceeds_capacity=exceeds,
                    below_min_attendance=below,
                )
            )
        return items
