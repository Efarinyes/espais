"""HTTP d’avisos in-app. El router no calcula negoci."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import NotificationsHttp, get_notifications_http, require_session
from app.domain.errors import NotificationNotFoundError
from app.domain.notification import NotificationType
from app.usecases.list_notifications import ListNotificationsQuery, NotificationListItem
from app.usecases.mark_notification_read import MarkNotificationReadCommand
from app.usecases.resolve_session import SessionView

router = APIRouter()


class AvisResponse(BaseModel):
    id: UUID
    type: NotificationType
    reservation_id: UUID
    entity_name: str
    space_name: str
    starts_at: str
    ends_at: str
    new_starts_at: str | None
    new_ends_at: str | None
    responsible_name: str
    reason: str | None
    read_at: datetime | None
    created_at: datetime


def _to_response(item: NotificationListItem) -> AvisResponse:
    return AvisResponse(
        id=item.id,
        type=item.type,
        reservation_id=item.reservation_id,
        entity_name=item.entity_name,
        space_name=item.space_name,
        starts_at=item.starts_at,
        ends_at=item.ends_at,
        new_starts_at=item.new_starts_at,
        new_ends_at=item.new_ends_at,
        responsible_name=item.responsible_name,
        reason=item.reason,
        read_at=item.read_at,
        created_at=item.created_at,
    )


@router.get("/avisos", response_model=list[AvisResponse])
def list_avisos(
    view: Annotated[SessionView, Depends(require_session)],
    notifications: Annotated[NotificationsHttp, Depends(get_notifications_http)],
) -> list[AvisResponse]:
    items = notifications.list.execute(
        ListNotificationsQuery(entity_id=view.entity_id, actor_user_id=view.user_id)
    )
    return [_to_response(item) for item in items]


@router.post("/avisos/{notification_id}/llegit", response_model=AvisResponse)
def mark_avis_llegit(
    notification_id: UUID,
    view: Annotated[SessionView, Depends(require_session)],
    notifications: Annotated[NotificationsHttp, Depends(get_notifications_http)],
) -> AvisResponse:
    try:
        result = notifications.mark_read.execute(
            MarkNotificationReadCommand(
                entity_id=view.entity_id,
                actor_user_id=view.user_id,
                notification_id=notification_id,
            )
        )
    except NotificationNotFoundError:
        raise HTTPException(status_code=404, detail="aquest avís no existeix") from None
    notification = result.notification
    payload = notification.payload
    return AvisResponse(
        id=notification.id,
        type=notification.type,
        reservation_id=notification.reservation_id,
        entity_name=payload.entity_name,
        space_name=payload.space_name,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        new_starts_at=payload.new_starts_at,
        new_ends_at=payload.new_ends_at,
        responsible_name=payload.responsible_name,
        reason=payload.reason,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )
