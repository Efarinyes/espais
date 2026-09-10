from datetime import datetime, timezone
from uuid import UUID

from app.adapters.notifier import text_correu
from app.domain.notification import Notification, NotificationPayload, NotificationType


def _avis(*, type: NotificationType, **payload: object) -> Notification:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "space_name": "Sala 1",
        "starts_at": "2026-09-08T08:00:00+00:00",
        "ends_at": "2026-09-08T09:00:00+00:00",
        "responsible_name": "Anna",
    }
    data.update(payload)
    return Notification(
        id=UUID(int=1),
        entity_id=UUID(int=10),
        user_id=UUID(int=100),
        reservation_id=UUID(int=5),
        type=type,
        payload=NotificationPayload(**data),  # type: ignore[arg-type]
        created_at=datetime(2026, 9, 8, 12, tzinfo=timezone.utc),
    )


def test_correu_de_reprogramacio_no_diu_anulada() -> None:
    avis = _avis(
        type=NotificationType.RESERVATION_RESCHEDULED,
        new_starts_at="2026-09-08T10:00:00+00:00",
        new_ends_at="2026-09-08T11:00:00+00:00",
    )
    subject, body = text_correu(avis)
    assert subject.startswith("Reserva reprogramada")
    assert "canviat l’horari" in body
    assert "anul·lat" not in body
    assert "10:00:00" in body


def test_correu_danulacio() -> None:
    subject, body = text_correu(_avis(type=NotificationType.RESERVATION_CANCELLED))
    assert subject.startswith("Reserva anul·lada")
    assert "anul·lat" in body
