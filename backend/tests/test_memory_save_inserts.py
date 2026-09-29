"""El save en memòria insereix si no hi ha fila.

La postcondició és la de SqlAlchemyReservationRepository.save (si no hi ha fila, add)
i la de SqlAlchemyNotificationRepository.save (el mateix).
"""

from datetime import UTC, datetime
from uuid import UUID

from app.adapters.memory.reservations import InMemoryReservationUnitOfWork
from app.domain.notification import Notification, NotificationPayload, NotificationType
from app.domain.reservation import Reservation, ReservationStatus

ENTITY_A = UUID(int=10)
NOW = datetime(2026, 9, 8, 12, tzinfo=UTC)


def test_save_inserts_reservation_when_missing() -> None:
    uow = InMemoryReservationUnitOfWork()
    reservation = Reservation(
        id=UUID(int=5),
        entity_id=ENTITY_A,
        space_id=UUID(int=1),
        coordinator_id=UUID(int=100),
        coordinator_name="Berta",
        starts_at=NOW,
        ends_at=datetime(2026, 9, 8, 13, tzinfo=UTC),
        status=ReservationStatus.CONFIRMED,
        notes=None,
        created_at=NOW,
    )
    uow.reservations.save(reservation)
    found = uow.reservations.get_by_id(ENTITY_A, reservation.id)
    assert found == reservation


def test_save_inserts_notification_when_missing() -> None:
    uow = InMemoryReservationUnitOfWork()
    notification = Notification(
        id=UUID(int=7),
        entity_id=ENTITY_A,
        user_id=UUID(int=100),
        reservation_id=UUID(int=5),
        type=NotificationType.RESERVATION_CANCELLED,
        payload=NotificationPayload(
            entity_name="AAVV Barri A",
            space_name="Sala 1",
            starts_at="2026-09-08T08:00:00+00:00",
            ends_at="2026-09-08T09:00:00+00:00",
            responsible_name="Anna",
        ),
        created_at=NOW,
    )
    uow.notifications.save(notification)
    found = uow.notifications.get_by_id(ENTITY_A, notification.id)
    assert found == notification
