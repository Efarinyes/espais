"""Repositori i UoW SQLAlchemy de reserves. Queries sempre amb entity_id."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.adapters.sqlalchemy.models import ReservationRow
from app.adapters.sqlalchemy.spaces import SqlAlchemySpaceRepository
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


class SqlAlchemyReservationUnitOfWork:
    def __init__(self, session_factory: sessionmaker) -> None:
        self._session = session_factory()
        self.spaces = SqlAlchemySpaceRepository(self._session)
        self.reservations = SqlAlchemyReservationRepository(self._session)

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def close(self) -> None:
        self._session.close()
