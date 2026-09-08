"""HTTP de reserves: sessió aporta entity_id; el router no calcula solapament."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import ReservationsHttp, get_reservations_http, require_session
from app.domain.errors import InvalidReservationError, ReservationOverlapError, SpaceNotFoundError
from app.domain.reservation import ReservationStatus
from app.usecases.create_reservation import CreateReservationCommand
from app.usecases.list_reservations import ListReservationsQuery, ReservationListItem
from app.usecases.resolve_session import SessionView

router = APIRouter()


class CreateReservationRequest(BaseModel):
    space_id: UUID
    starts_at: datetime
    ends_at: datetime
    notes: str | None = None


class ReservationResponse(BaseModel):
    id: UUID
    space_id: UUID
    space_name: str
    starts_at: datetime
    ends_at: datetime
    status: ReservationStatus
    mine: bool
    coordinator_name: str | None


def _to_response(item: ReservationListItem) -> ReservationResponse:
    return ReservationResponse(
        id=item.id,
        space_id=item.space_id,
        space_name=item.space_name,
        starts_at=item.starts_at,
        ends_at=item.ends_at,
        status=item.status,
        mine=item.mine,
        coordinator_name=item.coordinator_name,
    )


@router.post("/reserves", status_code=201, response_model=ReservationResponse)
def create_reservation(
    body: CreateReservationRequest,
    view: Annotated[SessionView, Depends(require_session)],
    reservations: Annotated[ReservationsHttp, Depends(get_reservations_http)],
) -> ReservationResponse:
    try:
        result = reservations.create.execute(
            CreateReservationCommand(
                entity_id=view.entity_id,
                actor_user_id=view.user_id,
                actor_role=view.role,
                actor_name=view.user_name,
                space_id=body.space_id,
                starts_at=body.starts_at,
                ends_at=body.ends_at,
                notes=body.notes,
            )
        )
    except SpaceNotFoundError:
        raise HTTPException(status_code=404, detail="aquest espai no existeix a l’entitat") from None
    except ReservationOverlapError:
        raise HTTPException(status_code=409, detail="aquest interval ja està ocupat") from None
    except InvalidReservationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    reservation = result.reservation
    return ReservationResponse(
        id=reservation.id,
        space_id=reservation.space_id,
        space_name=result.space_name,
        starts_at=reservation.starts_at,
        ends_at=reservation.ends_at,
        status=reservation.status,
        mine=True,
        coordinator_name=reservation.coordinator_name,
    )


@router.get("/reserves", response_model=list[ReservationResponse])
def list_reservations(
    view: Annotated[SessionView, Depends(require_session)],
    reservations: Annotated[ReservationsHttp, Depends(get_reservations_http)],
    des: Annotated[datetime, Query()],
    fins: Annotated[datetime, Query()],
    espai_id: Annotated[UUID | None, Query()] = None,
) -> list[ReservationResponse]:
    items = reservations.list.execute(
        ListReservationsQuery(
            entity_id=view.entity_id,
            actor_user_id=view.user_id,
            actor_role=view.role,
            starts_at=des,
            ends_at=fins,
            space_id=espai_id,
        )
    )
    return [_to_response(item) for item in items]
