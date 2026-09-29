"""HTTP d’espais: sessió aporta entity_id; el router no calcula unicitat."""

from datetime import time
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import SpacesHttp, get_spaces_http, require_session
from app.domain.errors import DuplicateSpaceNameError, ForbiddenError, InvalidSpaceError, SpaceNotFoundError
from app.domain.space import AvailabilityWindow, Space
from app.usecases.create_space import CreateSpaceCommand
from app.usecases.resolve_session import SessionView
from app.usecases.update_space import UpdateSpaceCommand

router = APIRouter()


class AvailabilityWindowBody(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start: time
    end: time


class CreateSpaceRequest(BaseModel):
    name: str
    capacity: int = Field(ge=1)
    equipment: str | None = None
    windows: list[AvailabilityWindowBody] | None = None
    min_attendance: int | bool | None = None


class UpdateSpaceRequest(BaseModel):
    name: str
    capacity: int = Field(ge=1)
    equipment: str | None = None
    active: bool = True
    windows: list[AvailabilityWindowBody] | None = None
    min_attendance: int | bool | None = None


class SpaceResponse(BaseModel):
    id: UUID
    entity_id: UUID
    name: str
    capacity: int
    equipment: str | None
    min_attendance: int | None
    active: bool
    windows: list[AvailabilityWindowBody]


def _domain_windows(items: list[AvailabilityWindowBody] | None) -> tuple[AvailabilityWindow, ...] | None:
    if items is None:
        return None
    return tuple(AvailabilityWindow(weekday=item.weekday, start=item.start, end=item.end) for item in items)


def _to_response(space: Space) -> SpaceResponse:
    return SpaceResponse(
        id=space.id,
        entity_id=space.entity_id,
        name=space.name,
        capacity=space.capacity,
        equipment=space.equipment,
        min_attendance=space.min_attendance,
        active=space.active,
        windows=[
            AvailabilityWindowBody(weekday=window.weekday, start=window.start, end=window.end)
            for window in space.windows
        ],
    )


@router.post("/espais", status_code=201, response_model=SpaceResponse)
def create_space(
    body: CreateSpaceRequest,
    view: Annotated[SessionView, Depends(require_session)],
    spaces: Annotated[SpacesHttp, Depends(get_spaces_http)],
) -> SpaceResponse:
    try:
        result = spaces.create.execute(
            CreateSpaceCommand(
                entity_id=view.entity_id,
                actor_role=view.role,
                name=body.name,
                capacity=body.capacity,
                equipment=body.equipment,
                windows=_domain_windows(body.windows),
                min_attendance=body.min_attendance,
            )
        )
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    except DuplicateSpaceNameError:
        raise HTTPException(
            status_code=409,
            detail="aquest nom d’espai ja existeix a l’entitat",
        ) from None
    except InvalidSpaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    return _to_response(result.space)


@router.get("/espais", response_model=list[SpaceResponse])
def list_spaces(
    view: Annotated[SessionView, Depends(require_session)],
    spaces: Annotated[SpacesHttp, Depends(get_spaces_http)],
) -> list[SpaceResponse]:
    return [_to_response(space) for space in spaces.list.execute(view.entity_id)]


@router.get("/espais/{space_id}", response_model=SpaceResponse)
def get_space(
    space_id: UUID,
    view: Annotated[SessionView, Depends(require_session)],
    spaces: Annotated[SpacesHttp, Depends(get_spaces_http)],
) -> SpaceResponse:
    try:
        space = spaces.get.execute(view.entity_id, space_id)
    except SpaceNotFoundError:
        raise HTTPException(status_code=404, detail="aquest espai no existeix a l’entitat") from None
    return _to_response(space)


@router.patch("/espais/{space_id}", response_model=SpaceResponse)
def update_space(
    space_id: UUID,
    body: UpdateSpaceRequest,
    view: Annotated[SessionView, Depends(require_session)],
    spaces: Annotated[SpacesHttp, Depends(get_spaces_http)],
) -> SpaceResponse:
    try:
        result = spaces.update.execute(
            UpdateSpaceCommand(
                entity_id=view.entity_id,
                space_id=space_id,
                actor_role=view.role,
                name=body.name,
                capacity=body.capacity,
                equipment=body.equipment,
                active=body.active,
                windows=_domain_windows(body.windows),
                min_attendance=body.min_attendance,
                min_attendance_set="min_attendance" in body.model_fields_set,
            )
        )
    except SpaceNotFoundError:
        raise HTTPException(status_code=404, detail="aquest espai no existeix a l’entitat") from None
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    except DuplicateSpaceNameError:
        raise HTTPException(
            status_code=409,
            detail="aquest nom d’espai ja existeix a l’entitat",
        ) from None
    except InvalidSpaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    return _to_response(result.space)
