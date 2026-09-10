"""Repositori i UoW SQLAlchemy de reserves. Queries sempre amb entity_id."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.adapters.sqlalchemy.models import AttendanceRecordRow, NotificationRow, ReservationRow
from app.adapters.sqlalchemy.spaces import SqlAlchemySpaceRepository
from app.domain.attendance import AttendanceRecord
from app.domain.notification import Notification, NotificationType, payload_as_dict, payload_from_dict
from app.domain.reservation import Reservation, ReservationStatus, as_utc


def _aware(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment


def _from_row(row: ReservationRow) -> Reservation:
    return Reservation(
        id=row.id,
        entity_id=row.entity_id,
        space_id=row.space_id,
        coordinator_id=row.coordinator_id,
        coordinator_name=row.coordinator_name,
        starts_at=_aware(row.starts_at),
        ends_at=_aware(row.ends_at),
        status=ReservationStatus(row.status),
        notes=row.notes,
        created_at=_aware(row.created_at),
    )


class SqlAlchemyReservationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, reservation: Reservation) -> None:
        self._session.add(
            ReservationRow(
                id=reservation.id,
                entity_id=reservation.entity_id,
                space_id=reservation.space_id,
                coordinator_id=reservation.coordinator_id,
                coordinator_name=reservation.coordinator_name,
                starts_at=reservation.starts_at,
                ends_at=reservation.ends_at,
                status=reservation.status.value,
                notes=reservation.notes,
                created_at=reservation.created_at,
            )
        )
        self._session.flush()

    def save(self, reservation: Reservation) -> None:
        row = self._session.scalar(
            select(ReservationRow).where(
                ReservationRow.id == reservation.id,
                ReservationRow.entity_id == reservation.entity_id,
            )
        )
        if row is None:
            self.add(reservation)
            return
        row.space_id = reservation.space_id
        row.coordinator_id = reservation.coordinator_id
        row.coordinator_name = reservation.coordinator_name
        row.starts_at = reservation.starts_at
        row.ends_at = reservation.ends_at
        row.status = reservation.status.value
        row.notes = reservation.notes
        self._session.flush()

    def get_by_id(self, entity_id: UUID, reservation_id: UUID) -> Reservation | None:
        row = self._session.scalar(
            select(ReservationRow).where(
                ReservationRow.id == reservation_id,
                ReservationRow.entity_id == entity_id,
            )
        )
        if row is None:
            return None
        return _from_row(row)

    def list_overlapping(
        self,
        entity_id: UUID,
        space_id: UUID,
        starts_at: datetime,
        ends_at: datetime,
    ) -> list[Reservation]:
        start = as_utc(starts_at)
        end = as_utc(ends_at)
        rows = self._session.scalars(
            select(ReservationRow).where(
                ReservationRow.entity_id == entity_id,
                ReservationRow.space_id == space_id,
                ReservationRow.status == ReservationStatus.CONFIRMED.value,
                ReservationRow.starts_at < end,
                ReservationRow.ends_at > start,
            )
        ).all()
        return [_from_row(row) for row in rows]

    def list_in_range(
        self,
        entity_id: UUID,
        starts_at: datetime,
        ends_at: datetime,
        space_id: UUID | None = None,
    ) -> list[Reservation]:
        start = as_utc(starts_at)
        end = as_utc(ends_at)
        stmt = select(ReservationRow).where(
            ReservationRow.entity_id == entity_id,
            ReservationRow.starts_at < end,
            ReservationRow.ends_at > start,
        )
        if space_id is not None:
            stmt = stmt.where(ReservationRow.space_id == space_id)
        rows = self._session.scalars(stmt.order_by(ReservationRow.starts_at)).all()
        return [_from_row(row) for row in rows]


def _attendance_from_row(row: AttendanceRecordRow) -> AttendanceRecord:
    return AttendanceRecord(
        id=row.id,
        entity_id=row.entity_id,
        reservation_id=row.reservation_id,
        strategy=row.strategy,
        count=row.count,
        recorded_at=_aware(row.recorded_at),
    )


class SqlAlchemyAttendanceRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_reservation_id(self, entity_id: UUID, reservation_id: UUID) -> AttendanceRecord | None:
        row = self._session.scalar(
            select(AttendanceRecordRow).where(
                AttendanceRecordRow.entity_id == entity_id,
                AttendanceRecordRow.reservation_id == reservation_id,
            )
        )
        if row is None:
            return None
        return _attendance_from_row(row)

    def save(self, record: AttendanceRecord) -> None:
        row = self._session.scalar(
            select(AttendanceRecordRow).where(
                AttendanceRecordRow.entity_id == record.entity_id,
                AttendanceRecordRow.reservation_id == record.reservation_id,
            )
        )
        if row is None:
            self._session.add(
                AttendanceRecordRow(
                    id=record.id,
                    entity_id=record.entity_id,
                    reservation_id=record.reservation_id,
                    strategy=record.strategy,
                    count=record.count,
                    recorded_at=record.recorded_at,
                )
            )
        else:
            row.strategy = record.strategy
            row.count = record.count
            row.recorded_at = record.recorded_at
        self._session.flush()

    def list_by_reservation_ids(
        self,
        entity_id: UUID,
        reservation_ids: list[UUID],
    ) -> dict[UUID, AttendanceRecord]:
        if not reservation_ids:
            return {}
        rows = self._session.scalars(
            select(AttendanceRecordRow).where(
                AttendanceRecordRow.entity_id == entity_id,
                AttendanceRecordRow.reservation_id.in_(reservation_ids),
            )
        ).all()
        return {row.reservation_id: _attendance_from_row(row) for row in rows}


def _notification_from_row(row: NotificationRow) -> Notification:
    raw = row.payload if isinstance(row.payload, dict) else {}
    return Notification(
        id=row.id,
        entity_id=row.entity_id,
        user_id=row.user_id,
        reservation_id=row.reservation_id,
        type=NotificationType(row.type),
        payload=payload_from_dict(raw),
        created_at=_aware(row.created_at),
        read_at=_aware(row.read_at) if row.read_at is not None else None,
    )


class SqlAlchemyNotificationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, notification: Notification) -> None:
        self._session.add(
            NotificationRow(
                id=notification.id,
                entity_id=notification.entity_id,
                user_id=notification.user_id,
                reservation_id=notification.reservation_id,
                type=notification.type.value,
                payload=payload_as_dict(notification.payload),
                created_at=notification.created_at,
                read_at=notification.read_at,
            )
        )
        self._session.flush()

    def save(self, notification: Notification) -> None:
        row = self._session.scalar(
            select(NotificationRow).where(
                NotificationRow.id == notification.id,
                NotificationRow.entity_id == notification.entity_id,
            )
        )
        if row is None:
            self.add(notification)
            return
        row.type = notification.type.value
        row.payload = payload_as_dict(notification.payload)
        row.read_at = notification.read_at
        self._session.flush()

    def get_by_id(self, entity_id: UUID, notification_id: UUID) -> Notification | None:
        row = self._session.scalar(
            select(NotificationRow).where(
                NotificationRow.id == notification_id,
                NotificationRow.entity_id == entity_id,
            )
        )
        if row is None:
            return None
        return _notification_from_row(row)

    def list_for_user(self, entity_id: UUID, user_id: UUID) -> list[Notification]:
        rows = self._session.scalars(
            select(NotificationRow)
            .where(
                NotificationRow.entity_id == entity_id,
                NotificationRow.user_id == user_id,
            )
            .order_by(NotificationRow.created_at.desc())
        ).all()
        return [_notification_from_row(row) for row in rows]


class SqlAlchemyReservationUnitOfWork:
    def __init__(self, session_factory: sessionmaker) -> None:
        self._session = session_factory()
        self.spaces = SqlAlchemySpaceRepository(self._session)
        self.reservations = SqlAlchemyReservationRepository(self._session)
        self.attendance = SqlAlchemyAttendanceRepository(self._session)
        self.notifications = SqlAlchemyNotificationRepository(self._session)

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def close(self) -> None:
        self._session.close()
