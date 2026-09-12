"""Resum d’ús dels espais d’una entitat en un període. Només el responsable."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.errors import ForbiddenError
from app.domain.identity import MembershipRole
from app.domain.occupancy import available_hours, occupancy_ratio, overlap_hours
from app.domain.reservation import ReservationStatus, as_utc
from app.ports.reservations import ReservationUnitOfWork


@dataclass(frozen=True)
class GetUsageSummaryQuery:
    entity_id: UUID
    actor_role: MembershipRole
    starts_at: datetime
    ends_at: datetime
    space_id: UUID | None = None


@dataclass(frozen=True)
class SpaceUsageRow:
    space_id: UUID
    space_name: str
    capacity: int
    min_attendance: int | None
    confirmed_count: int
    cancelled_count: int
    reserved_hours: float
    available_hours: float
    occupancy_ratio: float
    average_attendance: float | None
    unregistered_count: int
    below_min_attendance: bool


@dataclass(frozen=True)
class UsageSummary:
    starts_at: datetime
    ends_at: datetime
    confirmed_count: int
    cancelled_count: int
    reserved_hours: float
    available_hours: float
    occupancy_ratio: float
    average_attendance: float | None
    unregistered_count: int
    below_min_attendance: bool
    spaces: tuple[SpaceUsageRow, ...]


def _mean(values: list[int]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _below_min(average: float | None, min_attendance: int | None) -> bool:
    return average is not None and min_attendance is not None and average < min_attendance


class GetUsageSummary:
    def __init__(self, uow: ReservationUnitOfWork) -> None:
        self._uow = uow

    def execute(self, query: GetUsageSummaryQuery) -> UsageSummary:
        if query.actor_role != MembershipRole.RESPONSIBLE:
            raise ForbiddenError("només el responsable pot veure l’anàlisi d’ús")

        starts_at = as_utc(query.starts_at)
        ends_at = as_utc(query.ends_at)
        spaces = [
            space
            for space in self._uow.spaces.list_by_entity_id(query.entity_id)
            if query.space_id is None or space.id == query.space_id
        ]
        reservations = self._uow.reservations.list_in_range(
            query.entity_id,
            starts_at,
            ends_at,
            query.space_id,
        )
        records = self._uow.attendance.list_by_reservation_ids(
            query.entity_id,
            [reservation.id for reservation in reservations],
        )

        rows: list[SpaceUsageRow] = []
        all_counts: list[int] = []
        for space in spaces:
            of_space = [item for item in reservations if item.space_id == space.id]
            confirmed = [item for item in of_space if item.status == ReservationStatus.CONFIRMED]
            cancelled = [item for item in of_space if item.status == ReservationStatus.CANCELLED]
            reserved = sum(
                overlap_hours(item.starts_at, item.ends_at, starts_at, ends_at) for item in confirmed
            )
            available = available_hours(space.windows, starts_at, ends_at)
            counts = [records[item.id].count for item in confirmed if item.id in records]
            all_counts.extend(counts)
            average = _mean(counts)
            unregistered = sum(1 for item in confirmed if item.id not in records)
            rows.append(
                SpaceUsageRow(
                    space_id=space.id,
                    space_name=space.name,
                    capacity=space.capacity,
                    min_attendance=space.min_attendance,
                    confirmed_count=len(confirmed),
                    cancelled_count=len(cancelled),
                    reserved_hours=reserved,
                    available_hours=available,
                    occupancy_ratio=occupancy_ratio(reserved, available),
                    average_attendance=average,
                    unregistered_count=unregistered,
                    below_min_attendance=_below_min(average, space.min_attendance),
                )
            )

        reserved_total = sum(row.reserved_hours for row in rows)
        available_total = sum(row.available_hours for row in rows)
        return UsageSummary(
            starts_at=starts_at,
            ends_at=ends_at,
            confirmed_count=sum(row.confirmed_count for row in rows),
            cancelled_count=sum(row.cancelled_count for row in rows),
            reserved_hours=reserved_total,
            available_hours=available_total,
            occupancy_ratio=occupancy_ratio(reserved_total, available_total),
            average_attendance=_mean(all_counts),
            unregistered_count=sum(row.unregistered_count for row in rows),
            below_min_attendance=any(row.below_min_attendance for row in rows),
            spaces=tuple(rows),
        )
