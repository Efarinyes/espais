"""Ports de reserves: persistència acotada a entity_id."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.domain.reservation import Reservation
from app.ports.spaces import SpaceRepository


class ReservationRepository(Protocol):
    def add(self, reservation: Reservation) -> None: ...

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


class ReservationUnitOfWork(Protocol):
    spaces: SpaceRepository
    reservations: ReservationRepository

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
