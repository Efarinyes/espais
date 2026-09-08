"""HTTP d’espais: sessió aporta entity_id; el router no calcula unicitat."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import SpacesHttp, get_spaces_http, require_session
from app.domain.errors import DuplicateSpaceNameError, ForbiddenError, InvalidSpaceError
from app.domain.space import Space
from app.usecases.create_space import CreateSpaceCommand
from app.usecases.resolve_session import SessionView

router = APIRouter()


class CreateSpaceRequest(BaseModel):
    name: str
    capacity: int = Field(ge=1)
    equipment: str | None = None


class SpaceResponse(BaseModel):
    id: UUID
    entity_id: UUID
    name: str
    capacity: int
    equipment: str | None
    active: bool


def _to_response(space: Space) -> SpaceResponse:
    return SpaceResponse(
        id=space.id,
        entity_id=space.entity_id,
        name=space.name,
        capacity=space.capacity,
        equipment=space.equipment,
        active=space.active,
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
