"""Repositori i UoW SQLAlchemy d’espais. Queries sempre amb entity_id."""

from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.adapters.sqlalchemy.models import SpaceRow, SpaceWindowRow
from app.domain.errors import DuplicateSpaceNameError
from app.domain.space import AvailabilityWindow, Space
from app.usecases.create_space import normalize_space_name


def _is_duplicate_space_name(exc: IntegrityError) -> bool:
    text = str(exc.orig) if exc.orig is not None else str(exc)
    lowered = text.lower()
    return "uq_spaces_entity_name" in lowered or "name_normalized" in lowered


def _space_from_row(row: SpaceRow) -> Space:
    windows = tuple(
        AvailabilityWindow(weekday=w.weekday, start=w.start_time, end=w.end_time)
        for w in sorted(row.windows, key=lambda item: (item.weekday, item.start_time))
    )
    return Space(
        id=row.id,
        entity_id=row.entity_id,
        name=row.name,
        capacity=row.capacity,
        equipment=row.equipment,
        min_attendance=row.min_attendance,
        active=row.active,
        created_at=row.created_at,
        windows=windows,
    )


class SqlAlchemySpaceRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, space: Space) -> None:
        row = SpaceRow(
            id=space.id,
            entity_id=space.entity_id,
            name=space.name,
            name_normalized=normalize_space_name(space.name),
            capacity=space.capacity,
            equipment=space.equipment,
            min_attendance=space.min_attendance,
            active=space.active,
            created_at=space.created_at,
            windows=[
                SpaceWindowRow(
                    id=uuid4(),
                    weekday=window.weekday,
                    start_time=window.start,
                    end_time=window.end,
                )
                for window in space.windows
            ],
        )
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            if _is_duplicate_space_name(exc):
                raise DuplicateSpaceNameError(space.name) from exc
            raise

    def list_by_entity_id(self, entity_id: UUID) -> list[Space]:
        rows = self._session.scalars(
            select(SpaceRow)
            .where(SpaceRow.entity_id == entity_id)
            .options(selectinload(SpaceRow.windows))
            .order_by(SpaceRow.name)
        ).all()
        return [_space_from_row(row) for row in rows]

    def get_by_normalized_name(self, entity_id: UUID, name_normalized: str) -> Space | None:
        row = self._session.scalar(
            select(SpaceRow)
            .where(
                SpaceRow.entity_id == entity_id,
                SpaceRow.name_normalized == name_normalized,
            )
            .options(selectinload(SpaceRow.windows))
        )
        if row is None:
            return None
        return _space_from_row(row)

    def get_by_id(self, entity_id: UUID, space_id: UUID) -> Space | None:
        row = self._session.scalar(
            select(SpaceRow)
            .where(SpaceRow.id == space_id, SpaceRow.entity_id == entity_id)
            .options(selectinload(SpaceRow.windows))
        )
        if row is None:
            return None
        return _space_from_row(row)

    def save(self, space: Space) -> None:
        row = self._session.scalar(
            select(SpaceRow)
            .where(SpaceRow.id == space.id, SpaceRow.entity_id == space.entity_id)
            .options(selectinload(SpaceRow.windows))
        )
        if row is None:
            return
        row.name = space.name
        row.name_normalized = normalize_space_name(space.name)
        row.capacity = space.capacity
        row.equipment = space.equipment
        row.min_attendance = space.min_attendance
        row.active = space.active
        row.windows.clear()
        for window in space.windows:
            row.windows.append(
                SpaceWindowRow(
                    id=uuid4(),
                    weekday=window.weekday,
                    start_time=window.start,
                    end_time=window.end,
                )
            )
        try:
            self._session.flush()
        except IntegrityError as exc:
            if _is_duplicate_space_name(exc):
                raise DuplicateSpaceNameError(space.name) from exc
            raise


class SqlAlchemySpaceUnitOfWork:
    def __init__(self, session_factory: sessionmaker) -> None:
        self._session = session_factory()
        self.spaces = SqlAlchemySpaceRepository(self._session)

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def close(self) -> None:
        self._session.close()
