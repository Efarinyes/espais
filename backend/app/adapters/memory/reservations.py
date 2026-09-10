"""Adaptador in-memory de reserves (tests)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.domain.attendance import AttendanceRecord
from app.domain.notification import Notification
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

    def save(self, reservation: Reservation) -> None:
        for index, existing in enumerate(self._uow._working_reservations):
            if existing.entity_id == reservation.entity_id and existing.id == reservation.id:
                self._uow._working_reservations[index] = reservation
                return

    def get_by_id(self, entity_id: UUID, reservation_id: UUID) -> Reservation | None:
        for reservation in self._uow._working_reservations:
            if reservation.entity_id == entity_id and reservation.id == reservation_id:
                return reservation
        return None

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


class InMemoryAttendanceRepository:
    def __init__(self, uow: InMemoryReservationUnitOfWork) -> None:
        self._uow = uow

    def get_by_reservation_id(self, entity_id: UUID, reservation_id: UUID) -> AttendanceRecord | None:
        for record in self._uow._working_attendance:
            if record.entity_id == entity_id and record.reservation_id == reservation_id:
                return record
        return None

    def save(self, record: AttendanceRecord) -> None:
        for index, existing in enumerate(self._uow._working_attendance):
            if existing.entity_id == record.entity_id and existing.reservation_id == record.reservation_id:
                self._uow._working_attendance[index] = record
                return
        self._uow._working_attendance.append(record)

    def list_by_reservation_ids(
        self,
        entity_id: UUID,
        reservation_ids: list[UUID],
    ) -> dict[UUID, AttendanceRecord]:
        wanted = set(reservation_ids)
        return {
            record.reservation_id: record
            for record in self._uow._working_attendance
            if record.entity_id == entity_id and record.reservation_id in wanted
        }


class InMemoryNotificationRepository:
    def __init__(self, uow: InMemoryReservationUnitOfWork) -> None:
        self._uow = uow

    def add(self, notification: Notification) -> None:
        self._uow._working_notifications.append(notification)

    def save(self, notification: Notification) -> None:
        for index, existing in enumerate(self._uow._working_notifications):
            if existing.entity_id == notification.entity_id and existing.id == notification.id:
                self._uow._working_notifications[index] = notification
                return

    def get_by_id(self, entity_id: UUID, notification_id: UUID) -> Notification | None:
        for notification in self._uow._working_notifications:
            if notification.entity_id == entity_id and notification.id == notification_id:
                return notification
        return None

    def list_for_user(self, entity_id: UUID, user_id: UUID) -> list[Notification]:
        items = [
            notification
            for notification in self._uow._working_notifications
            if notification.entity_id == entity_id and notification.user_id == user_id
        ]
        return sorted(items, key=lambda item: item.created_at, reverse=True)


class InMemoryReservationUnitOfWork:
    def __init__(self) -> None:
        self._committed_spaces: list[Space] = []
        self._working_spaces: list[Space] = []
        self._committed_reservations: list[Reservation] = []
        self._working_reservations: list[Reservation] = []
        self._committed_attendance: list[AttendanceRecord] = []
        self._working_attendance: list[AttendanceRecord] = []
        self._committed_notifications: list[Notification] = []
        self._working_notifications: list[Notification] = []
        self.spaces = InMemoryReservationSpaceRepository(self)
        self.reservations = InMemoryReservationRepository(self)
        self.attendance = InMemoryAttendanceRepository(self)
        self.notifications = InMemoryNotificationRepository(self)

    def commit(self) -> None:
        self._committed_spaces = list(self._working_spaces)
        self._committed_reservations = list(self._working_reservations)
        self._committed_attendance = list(self._working_attendance)
        self._committed_notifications = list(self._working_notifications)

    def rollback(self) -> None:
        self._working_spaces = list(self._committed_spaces)
        self._working_reservations = list(self._committed_reservations)
        self._working_attendance = list(self._committed_attendance)
        self._working_notifications = list(self._committed_notifications)
