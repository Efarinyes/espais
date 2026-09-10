"""HTTP de reserves: sessió aporta entity_id; el router no calcula solapament ni assistència."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.deps import ReservationsHttp, get_reservations_http, require_session
from app.domain.errors import (
    ForbiddenError,
    InvalidAttendanceError,
    InvalidCancellationError,
    InvalidReservationError,
    ReservationNotFoundError,
    ReservationOverlapError,
    SpaceNotFoundError,
)
from app.domain.identity import MembershipRole
from app.domain.reservation import ReservationStatus
from app.usecases.cancel_reservation_by_responsible import CancelReservationByResponsibleCommand
from app.usecases.create_reservation import CreateReservationCommand
from app.usecases.list_reservations import ListReservationsQuery, ReservationListItem
from app.usecases.record_attendance import RecordAttendanceCommand
from app.usecases.reschedule_reservation import RescheduleReservationCommand
from app.usecases.resolve_session import SessionView

router = APIRouter()


class CreateReservationRequest(BaseModel):
    space_id: UUID
    starts_at: datetime
    ends_at: datetime
    notes: str | None = None


class RecordAttendanceRequest(BaseModel):
    count: int = Field(ge=0)


class CancelReservationRequest(BaseModel):
    reason: str | None = None


class RescheduleReservationRequest(BaseModel):
    starts_at: datetime
    ends_at: datetime
    reason: str | None = None


class ReservationResponse(BaseModel):
    id: UUID
    space_id: UUID
    space_name: str
    starts_at: datetime
    ends_at: datetime
    status: ReservationStatus
    mine: bool
    coordinator_name: str | None
    attendance_count: int | None
    capacity: int
    min_attendance: int | None
    exceeds_capacity: bool
    below_min_attendance: bool


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
        attendance_count=item.attendance_count,
        capacity=item.capacity,
        min_attendance=item.min_attendance,
        exceeds_capacity=item.exceeds_capacity,
        below_min_attendance=item.below_min_attendance,
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
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
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
        attendance_count=None,
        capacity=result.capacity,
        min_attendance=result.min_attendance,
        exceeds_capacity=False,
        below_min_attendance=False,
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


@router.put("/reserves/{reservation_id}/assistencia", response_model=ReservationResponse)
def record_attendance(
    reservation_id: UUID,
    body: RecordAttendanceRequest,
    view: Annotated[SessionView, Depends(require_session)],
    reservations: Annotated[ReservationsHttp, Depends(get_reservations_http)],
) -> ReservationResponse:
    try:
        result = reservations.record.execute(
            RecordAttendanceCommand(
                entity_id=view.entity_id,
                actor_user_id=view.user_id,
                reservation_id=reservation_id,
                count=body.count,
            )
        )
    except ReservationNotFoundError:
        raise HTTPException(status_code=404, detail="aquesta reserva no existeix a l’entitat") from None
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    except InvalidAttendanceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except SpaceNotFoundError:
        raise HTTPException(status_code=404, detail="aquest espai no existeix a l’entitat") from None

    reservation = result.reservation
    mine = reservation.coordinator_id == view.user_id
    show_name = view.role == MembershipRole.RESPONSIBLE or mine
    return ReservationResponse(
        id=reservation.id,
        space_id=reservation.space_id,
        space_name=result.space_name,
        starts_at=reservation.starts_at,
        ends_at=reservation.ends_at,
        status=reservation.status,
        mine=mine,
        coordinator_name=reservation.coordinator_name if show_name else None,
        attendance_count=result.record.count,
        capacity=result.capacity,
        min_attendance=result.min_attendance,
        exceeds_capacity=result.exceeds_capacity,
        below_min_attendance=result.below_min_attendance,
    )


@router.post("/reserves/{reservation_id}/anulacio", response_model=ReservationResponse)
def cancel_reservation(
    reservation_id: UUID,
    view: Annotated[SessionView, Depends(require_session)],
    reservations: Annotated[ReservationsHttp, Depends(get_reservations_http)],
    body: CancelReservationRequest | None = None,
) -> ReservationResponse:
    payload = body or CancelReservationRequest()
    try:
        result = reservations.cancel.execute(
            CancelReservationByResponsibleCommand(
                entity_id=view.entity_id,
                actor_user_id=view.user_id,
                actor_role=view.role,
                actor_name=view.user_name,
                entity_name=view.entity_name,
                reservation_id=reservation_id,
                reason=payload.reason,
            )
        )
    except ReservationNotFoundError:
        raise HTTPException(status_code=404, detail="aquesta reserva no existeix a l’entitat") from None
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    except InvalidCancellationError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
    except SpaceNotFoundError:
        raise HTTPException(status_code=404, detail="aquest espai no existeix a l’entitat") from None

    reservation = result.reservation
    return ReservationResponse(
        id=reservation.id,
        space_id=reservation.space_id,
        space_name=result.space_name,
        starts_at=reservation.starts_at,
        ends_at=reservation.ends_at,
        status=reservation.status,
        mine=reservation.coordinator_id == view.user_id,
        coordinator_name=reservation.coordinator_name,
        attendance_count=None,
        capacity=result.capacity,
        min_attendance=result.min_attendance,
        exceeds_capacity=False,
        below_min_attendance=False,
    )


@router.post("/reserves/{reservation_id}/reprogramacio", response_model=ReservationResponse)
def reschedule_reservation(
    reservation_id: UUID,
    body: RescheduleReservationRequest,
    view: Annotated[SessionView, Depends(require_session)],
    reservations: Annotated[ReservationsHttp, Depends(get_reservations_http)],
) -> ReservationResponse:
    try:
        result = reservations.reschedule.execute(
            RescheduleReservationCommand(
                entity_id=view.entity_id,
                actor_user_id=view.user_id,
                actor_role=view.role,
                actor_name=view.user_name,
                entity_name=view.entity_name,
                reservation_id=reservation_id,
                starts_at=body.starts_at,
                ends_at=body.ends_at,
                reason=body.reason,
            )
        )
    except ReservationNotFoundError:
        raise HTTPException(status_code=404, detail="aquesta reserva no existeix a l’entitat") from None
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    except ReservationOverlapError:
        raise HTTPException(status_code=409, detail="aquest interval ja està ocupat") from None
    except InvalidReservationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except SpaceNotFoundError:
        raise HTTPException(status_code=404, detail="aquest espai no existeix a l’entitat") from None

    reservation = result.reservation
    return ReservationResponse(
        id=reservation.id,
        space_id=reservation.space_id,
        space_name=result.space_name,
        starts_at=reservation.starts_at,
        ends_at=reservation.ends_at,
        status=reservation.status,
        mine=reservation.coordinator_id == view.user_id,
        coordinator_name=reservation.coordinator_name,
        attendance_count=None,
        capacity=result.capacity,
        min_attendance=result.min_attendance,
        exceeds_capacity=False,
        below_min_attendance=False,
    )
