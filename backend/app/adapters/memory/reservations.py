"""Adaptador in-memory de reserves (tests)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.domain.reservation import Reservation, ReservationStatus, intervals_overlap
from app.domain.space import Space
from app.usecases.create_space import normalize_space_name


class InMemoryReservationSpaceRepository:

    def __init__(self, uow: InMemoryReservationUnitOfWork) -> None:
        self._res_uow = uow

    def add(self, space: Space) -> None:
        self._res_uow._working_spaces.append(space)

    def list_by_entity_id(self, entity_id: UUID) -> list[Space]:
        return [space for space in self._res_uow._working_spaces if space.entity_id == entity_id]

    def get_by_normalized_name(self, entity_id: UUID, name_normalized: str) -> Space | None:
        for space in self._res_uow._working_spaces:
            if space.entity_id == entity_id and normalize_space_name(space.name) == name_normalized:
                return space
        return None

    def get_by_id(self, entity_id: UUID, space_id: UUID) -> Space | None:
        for space in self._res_uow._working_spaces:
            if space.entity_id == entity_id and space.id == space_id:
                return space
        return None

    def save(self, space: Space) -> None:
        for index, existing in enumerate(self._res_uow._working_spaces):
            if existing.id == space.id and existing.entity_id == space.entity_id:
                self._res_uow._working_spaces[index] = space
                return


class InMemoryReservationRepository:
    def __init__(self, uow: InMemoryReservationUnitOfWork) -> None:
        self._uow = uow

    def add(self, reservation: Reservation) -> None:
        self._uow._working_reservations.append(reservation)

    def list_all(self) -> list[Reservation]:
        return list(self._uow._working_reservations)

    def list_overlapping(
        self,
        entity_id: UUID,
        space_id: UUID,
        starts_at: datetime,
        ends_at: datetime,
    ) -> list[Reservation]:
        return [
            reservation
            for reservation in self._uow._working_reservations
            if reservation.entity_id == entity_id
            and reservation.space_id == space_id
            and reservation.status == ReservationStatus.CONFIRMED
            and intervals_overlap(reservation.starts_at, reservation.ends_at, starts_at, ends_at)
        ]

    def list_in_range(
        self,
        entity_id: UUID,
        starts_at: datetime,
        ends_at: datetime,
        space_id: UUID | None = None,
    ) -> list[Reservation]:
        items: list[Reservation] = []
        for reservation in self._uow._working_reservations:
            if reservation.entity_id != entity_id:
                continue
            if space_id is not None and reservation.space_id != space_id:
                continue
            if not intervals_overlap(reservation.starts_at, reservation.ends_at, starts_at, ends_at):
                continue
            items.append(reservation)
        return items


class InMemoryReservationUnitOfWork:
    def __init__(self) -> None:
        self._committed_spaces: list[Space] = []
        self._working_spaces: list[Space] = []
        self._committed_reservations: list[Reservation] = []
        self._working_reservations: list[Reservation] = []
        self.spaces = InMemoryReservationSpaceRepository(self)
        self.reservations = InMemoryReservationRepository(self)

    def commit(self) -> None:
        self._committed_spaces = list(self._working_spaces)
        self._committed_reservations = list(self._working_reservations)

    def rollback(self) -> None:
        self._working_spaces = list(self._committed_spaces)
        self._working_reservations = list(self._committed_reservations)
