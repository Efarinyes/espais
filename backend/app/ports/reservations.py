"""Ports de reserves: persistència acotada a entity_id."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.domain.attendance import AttendanceRecord
from app.domain.reservation import Reservation
from app.ports.notifications import NotificationRepository
from app.ports.spaces import SpaceRepository


class ReservationRepository(Protocol):
    def add(self, reservation: Reservation) -> None: ...

    def save(self, reservation: Reservation) -> None: ...

    def get_by_id(self, entity_id: UUID, reservation_id: UUID) -> Reservation | None: ...

    def list_overlapping(
        self,
        entity_id: UUID,
        space_id: UUID,
        starts_at: datetime,
        ends_at: datetime,
    ) -> list[Reservation]: ...

    def list_in_range(
        self,
        entity_id: UUID,
        starts_at: datetime,
        ends_at: datetime,
        space_id: UUID | None = None,
    ) -> list[Reservation]: ...


class AttendanceRepository(Protocol):
    def get_by_reservation_id(self, entity_id: UUID, reservation_id: UUID) -> AttendanceRecord | None: ...

    def save(self, record: AttendanceRecord) -> None: ...

    def list_by_reservation_ids(
        self,
        entity_id: UUID,
        reservation_ids: list[UUID],
    ) -> dict[UUID, AttendanceRecord]: ...


class ReservationUnitOfWork(Protocol):
    spaces: SpaceRepository
    reservations: ReservationRepository
    attendance: AttendanceRepository
    notifications: NotificationRepository

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
