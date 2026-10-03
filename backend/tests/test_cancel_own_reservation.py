from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

import pytest

from app.adapters.memory.identity import FixedClock, SequentialIdGenerator
from app.adapters.memory.reservations import InMemoryReservationUnitOfWork
from app.domain.errors import ForbiddenError
from app.domain.identity import MembershipRole
from app.domain.reservation import ReservationStatus
from app.domain.space import Space, default_week_windows
from app.usecases.cancel_own_reservation import CancelOwnReservation, CancelOwnReservationCommand
from app.usecases.create_reservation import CreateReservation, CreateReservationCommand
from app.usecases.list_notifications import ListNotifications, ListNotificationsQuery

MADRID = ZoneInfo("Europe/Madrid")
ENTITY_A = UUID(int=10)
USER_A = UUID(int=100)
USER_B = UUID(int=200)
SPACE_A = UUID(int=1)


def _preparar() -> tuple[CancelOwnReservation, InMemoryReservationUnitOfWork, UUID]:
    uow = InMemoryReservationUnitOfWork()
    uow.spaces.add(
        Space(
            id=SPACE_A,
            entity_id=ENTITY_A,
            name="Sala 1",
            capacity=40,
            equipment=None,
            min_attendance=None,
            active=True,
            created_at=datetime(2026, 9, 8, 12, tzinfo=MADRID),
            windows=default_week_windows(),
        )
    )
    uow.commit()
    start = datetime(2026, 9, 8, 10, 0, tzinfo=MADRID)
    created = CreateReservation(uow, FixedClock(), SequentialIdGenerator()).execute(
        CreateReservationCommand(
            entity_id=ENTITY_A,
            actor_user_id=USER_A,
            actor_role=MembershipRole.COORDINATOR,
            actor_name="Carla",
            space_id=SPACE_A,
            starts_at=start,
            ends_at=start + timedelta(minutes=60),
        )
    )
    return CancelOwnReservation(uow), uow, created.reservation.id


def test_coordinator_cancels_own_reservation_without_notice() -> None:
    cancel, uow, reservation_id = _preparar()
    result = cancel.execute(
        CancelOwnReservationCommand(
            entity_id=ENTITY_A,
            actor_user_id=USER_A,
            actor_role=MembershipRole.COORDINATOR,
            reservation_id=reservation_id,
        )
    )
    assert result.reservation.status == ReservationStatus.CANCELLED
    avisos = ListNotifications(uow).execute(
        ListNotificationsQuery(entity_id=ENTITY_A, actor_user_id=USER_A)
    )
    assert avisos == []


def test_coordinator_cannot_cancel_another_reservation() -> None:
    cancel, _uow, reservation_id = _preparar()
    with pytest.raises(ForbiddenError):
        cancel.execute(
            CancelOwnReservationCommand(
                entity_id=ENTITY_A,
                actor_user_id=USER_B,
                actor_role=MembershipRole.COORDINATOR,
                reservation_id=reservation_id,
            )
        )


def test_responsible_cannot_use_own_cancel() -> None:
    cancel, _uow, reservation_id = _preparar()
    with pytest.raises(ForbiddenError):
        cancel.execute(
            CancelOwnReservationCommand(
                entity_id=ENTITY_A,
                actor_user_id=USER_A,
                actor_role=MembershipRole.RESPONSIBLE,
                reservation_id=reservation_id,
            )
        )
