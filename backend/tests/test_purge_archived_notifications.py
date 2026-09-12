from datetime import UTC, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.adapters.memory.identity import FixedClock
from app.adapters.memory.reservations import InMemoryReservationUnitOfWork
from app.adapters.sqlalchemy.models import NotificationRow
from app.adapters.sqlalchemy.reservations import SqlAlchemyReservationUnitOfWork
from app.domain.notification import (
    ARCHIVED_NOTIFICATION_RETENTION,
    Notification,
    NotificationPayload,
    NotificationType,
)
from app.main import create_app
from app.usecases.purge_archived_notifications import PurgeArchivedNotifications

NOW = datetime(2026, 9, 29, 12, tzinfo=UTC)
CUTOFF = NOW - ARCHIVED_NOTIFICATION_RETENTION
ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)
USER_A = UUID(int=100)


def _avis(
    *,
    nid: int,
    entity_id: UUID = ENTITY_A,
    read_at: datetime | None = None,
    archived_at: datetime | None = None,
    created_at: datetime | None = None,
) -> Notification:
    return Notification(
        id=UUID(int=nid),
        entity_id=entity_id,
        user_id=USER_A,
        reservation_id=UUID(int=500),
        type=NotificationType.RESERVATION_CANCELLED,
        payload=NotificationPayload(
            entity_name="AAVV Barri A",
            space_name="Sala 1",
            starts_at="2026-09-08T08:00:00+00:00",
            ends_at="2026-09-08T09:00:00+00:00",
            responsible_name="Anna",
        ),
        created_at=created_at or datetime(2026, 8, 1, 12, tzinfo=UTC),
        read_at=read_at,
        archived_at=archived_at,
    )


def test_deletes_notifications_archived_three_weeks_ago() -> None:
    uow = InMemoryReservationUnitOfWork()
    uow.notifications.add(_avis(nid=1, read_at=CUTOFF, archived_at=CUTOFF))
    uow.commit()
    result = PurgeArchivedNotifications(uow, FixedClock(NOW)).execute()
    assert result.deleted == 1
    assert uow.notifications.get_by_id(ENTITY_A, UUID(int=1)) is None


def test_keeps_notifications_archived_less_than_three_weeks() -> None:
    uow = InMemoryReservationUnitOfWork()
    recent = CUTOFF + timedelta(days=1)
    uow.notifications.add(_avis(nid=1, read_at=recent, archived_at=recent))
    uow.commit()
    result = PurgeArchivedNotifications(uow, FixedClock(NOW)).execute()
    assert result.deleted == 0
    assert uow.notifications.get_by_id(ENTITY_A, UUID(int=1)) is not None


def test_keeps_unread_and_read_not_archived() -> None:
    uow = InMemoryReservationUnitOfWork()
    uow.notifications.add(_avis(nid=1, created_at=datetime(2026, 1, 1, tzinfo=UTC)))
    uow.notifications.add(
        _avis(nid=2, read_at=datetime(2026, 1, 2, tzinfo=UTC), created_at=datetime(2026, 1, 1, tzinfo=UTC))
    )
    uow.commit()
    result = PurgeArchivedNotifications(uow, FixedClock(NOW)).execute()
    assert result.deleted == 0
    assert uow.notifications.get_by_id(ENTITY_A, UUID(int=1)) is not None
    assert uow.notifications.get_by_id(ENTITY_A, UUID(int=2)) is not None


def test_purges_archived_from_every_entity() -> None:
    uow = InMemoryReservationUnitOfWork()
    uow.notifications.add(_avis(nid=1, entity_id=ENTITY_A, read_at=CUTOFF, archived_at=CUTOFF))
    uow.notifications.add(_avis(nid=2, entity_id=ENTITY_B, read_at=CUTOFF, archived_at=CUTOFF))
    uow.commit()
    result = PurgeArchivedNotifications(uow, FixedClock(NOW)).execute()
    assert result.deleted == 2
    assert uow.notifications.get_by_id(ENTITY_A, UUID(int=1)) is None
    assert uow.notifications.get_by_id(ENTITY_B, UUID(int=2)) is None


def test_sqlalchemy_deletes_old_archived_row(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory))
    created = client.post(
        "/registre",
        json={
            "entity_name": "AAVV Barri A",
            "typology": "associació de veïns",
            "responsible_name": "Anna",
            "email": "anna-purge@example.com",
            "password": "secret123",
        },
    )
    assert created.status_code == 201
    headers_resp = {"Authorization": f"Bearer {created.json()['token']}"}
    invited = client.post("/invitacions", headers=headers_resp, json={"email": "carla-purge@example.com"})
    token = invited.json()["accept_url"].rsplit("/", 1)[-1]
    coord = client.post(
        f"/invitacions/{token}/acceptar",
        json={"name": "Carla", "password": "secret123"},
    )
    assert coord.status_code == 201
    headers_coord = {"Authorization": f"Bearer {coord.json()['token']}"}
    space = client.post("/espais", headers=headers_resp, json={"name": "Sala 1", "capacity": 40})
    start = datetime(2026, 9, 8, 10, 0, tzinfo=ZoneInfo("Europe/Madrid"))
    posted = client.post(
        "/reserves",
        headers=headers_coord,
        json={
            "space_id": space.json()["id"],
            "starts_at": start.isoformat(),
            "ends_at": (start + timedelta(hours=1)).isoformat(),
        },
    )
    assert posted.status_code == 201
    cancelled = client.post(f"/reserves/{posted.json()['id']}/anulacio", headers=headers_resp)
    assert cancelled.status_code == 200
    avis_id = UUID(client.get("/avisos", headers=headers_coord).json()[0]["id"])
    client.post(f"/avisos/{avis_id}/llegit", headers=headers_coord)
    client.post(f"/avisos/{avis_id}/arxivat", headers=headers_coord)

    session = sqlite_session_factory()
    try:
        row = session.get(NotificationRow, avis_id)
        assert row is not None
        row.archived_at = CUTOFF
        session.commit()
    finally:
        session.close()

    entity_id = UUID(created.json()["entity_id"])
    uow = SqlAlchemyReservationUnitOfWork(sqlite_session_factory)
    try:
        result = PurgeArchivedNotifications(uow, FixedClock(NOW)).execute()
        assert result.deleted == 1
        assert uow.notifications.get_by_id(entity_id, avis_id) is None
    finally:
        uow.close()


def test_maintenance_loop_starts_and_stops(sqlite_session_factory) -> None:
    client = TestClient(create_app(session_factory=sqlite_session_factory, enable_maintenance=True))
    assert client.get("/salut").status_code == 200
