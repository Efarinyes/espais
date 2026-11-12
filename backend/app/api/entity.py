"""Paleta de l’entitat: la desa el responsable; tothom la llegeix via sessió."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import IdentityHttp, get_identity_http, require_session
from app.domain.errors import ForbiddenError, InvalidPaletteError, SessionNotFoundError
from app.usecases.list_entity_coordinators import (
    ListEntityCoordinatorsQuery,
)
from app.usecases.resolve_session import SessionView
from app.usecases.update_entity_palette import UpdateEntityPaletteCommand

router = APIRouter()


class UpdatePaletteRequest(BaseModel):
    palette: str


class PaletteResponse(BaseModel):
    palette: str


class CoordinatorResponse(BaseModel):
    id: UUID
    name: str


@router.get("/entitat/coordinadors", response_model=list[CoordinatorResponse])
def list_entity_coordinators(
    view: Annotated[SessionView, Depends(require_session)],
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> list[CoordinatorResponse]:
    try:
        items = identity.list_coordinators.execute(
            ListEntityCoordinatorsQuery(entity_id=view.entity_id, actor_role=view.role)
        )
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    except SessionNotFoundError:
        raise HTTPException(status_code=401, detail="sessió invàlida") from None
    return [CoordinatorResponse(id=item.id, name=item.name) for item in items]


@router.patch("/entitat/paleta", response_model=PaletteResponse)
def update_entity_palette(
    body: UpdatePaletteRequest,
    view: Annotated[SessionView, Depends(require_session)],
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> PaletteResponse:
    try:
        result = identity.update_palette.execute(
            UpdateEntityPaletteCommand(
                entity_id=view.entity_id,
                actor_role=view.role,
                palette=body.palette,
            )
        )
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    except InvalidPaletteError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except SessionNotFoundError:
        raise HTTPException(status_code=401, detail="sessió invàlida") from None
    return PaletteResponse(palette=result.palette)
