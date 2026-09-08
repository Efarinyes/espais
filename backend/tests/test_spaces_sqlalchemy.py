from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from app.adapters.sqlalchemy.spaces import SqlAlchemySpaceUnitOfWork
from app.domain.space import Space
from app.domain.space import default_week_windows


def test_fk_failure_is_not_duplicate_name(sqlite_session_factory) -> None:
    uow = SqlAlchemySpaceUnitOfWork(sqlite_session_factory)
    space = Space(
        id=uuid4(),
        entity_id=uuid4(),
        name="Sala 1",
        capacity=10,
        equipment=None,
        min_attendance=None,
        active=True,
        created_at=datetime.now(timezone.utc),
        windows=default_week_windows(),
    )
    try:
        with pytest.raises(IntegrityError):
            uow.spaces.add(space)
    finally:
        uow.close()
