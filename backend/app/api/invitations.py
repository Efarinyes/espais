"""Invitació de coordinadors: crea token, previsualitza i accepta."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import IdentityHttp, get_identity_http, require_session
from app.api.session import SessionResponse, session_response
from app.domain.errors import (
    DuplicateEmailError,
    ForbiddenError,
    InvitationAcceptedError,
    InvitationExpiredError,
    InvitationNotFoundError,
    InvalidRegistrationError,
)
from app.usecases.accept_invitation import AcceptInvitationCommand
from app.usecases.invite_coordinator import InviteCoordinatorCommand
from app.usecases.resolve_session import SessionView

router = APIRouter()


class InviteCoordinatorRequest(BaseModel):
    email: str


class InviteCoordinatorResponse(BaseModel):
    email: str
    accept_url: str
    expires_at: datetime


class InvitationPreviewResponse(BaseModel):
    email: str
    entity_name: str


class AcceptInvitationRequest(BaseModel):
    name: str
    password: str = Field(min_length=1)


class AcceptInvitationResponse(SessionResponse):
    membership_id: UUID
    token: str


def _invitation_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ForbiddenError):
        return HTTPException(status_code=403, detail="només el responsable pot convidar coordinadors")
    if isinstance(exc, DuplicateEmailError):
        return HTTPException(status_code=409, detail="aquest email ja està registrat")
    if isinstance(exc, InvalidRegistrationError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, InvitationNotFoundError):
        return HTTPException(status_code=404, detail="aquesta invitació no existeix")
    if isinstance(exc, InvitationExpiredError):
        return HTTPException(status_code=410, detail="aquesta invitació ha caducat")
    if isinstance(exc, InvitationAcceptedError):
        return HTTPException(status_code=410, detail="aquesta invitació ja s’ha acceptat")
    raise exc


@router.post("/invitacions", status_code=201, response_model=InviteCoordinatorResponse)
def invite_coordinator(
    body: InviteCoordinatorRequest,
    view: Annotated[SessionView, Depends(require_session)],
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> InviteCoordinatorResponse:
    try:
        result = identity.invite.execute(
            InviteCoordinatorCommand(
                entity_id=view.entity_id,
                actor_role=view.role,
                email=body.email,
            )
        )
    except (
        ForbiddenError,
        DuplicateEmailError,
        InvalidRegistrationError,
    ) as exc:
        raise _invitation_http_error(exc) from None
    return InviteCoordinatorResponse(
        email=result.email,
        accept_url=f"/invitar/{result.token}",
        expires_at=result.expires_at,
    )


@router.get("/invitacions/{token}", response_model=InvitationPreviewResponse)
def preview_invitation(
    token: str,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> InvitationPreviewResponse:
    try:
        result = identity.preview.execute(token)
    except (InvitationNotFoundError, InvitationExpiredError, InvitationAcceptedError) as exc:
        raise _invitation_http_error(exc) from None
    return InvitationPreviewResponse(email=result.email, entity_name=result.entity_name)


@router.post("/invitacions/{token}/acceptar", status_code=201, response_model=AcceptInvitationResponse)
def accept_invitation(
    token: str,
    body: AcceptInvitationRequest,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> AcceptInvitationResponse:
    try:
        result = identity.accept.execute(
            AcceptInvitationCommand(token=token, name=body.name, password=body.password)
        )
    except (
        DuplicateEmailError,
        InvalidRegistrationError,
        InvitationNotFoundError,
        InvitationExpiredError,
        InvitationAcceptedError,
    ) as exc:
        raise _invitation_http_error(exc) from None

    view = identity.resolve.execute(result.user_id)
    token_sessio = identity.tokens.issue(result.user_id)
    base = session_response(view, token=token_sessio)
    return AcceptInvitationResponse(membership_id=result.membership_id, **base.model_dump())
