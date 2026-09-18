"""Sessió: login i lectura del principal. L’entity_id ve de la membership."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import IdentityHttp, get_identity_http, require_session
from app.domain.errors import InvalidCredentialsError
from app.domain.identity import MembershipRole
from app.usecases.authenticate_user import AuthenticateUserCommand
from app.usecases.resolve_session import SessionView

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)


class SessionResponse(BaseModel):
    entity_id: UUID
    user_id: UUID
    role: MembershipRole
    entity_name: str
    user_name: str
    typology: str | None
    palette: str
    token: str | None = None


def session_response(view: SessionView, token: str | None = None) -> SessionResponse:
    return SessionResponse(
        entity_id=view.entity_id,
        user_id=view.user_id,
        role=view.role,
        entity_name=view.entity_name,
        user_name=view.user_name,
        typology=view.typology,
        palette=view.palette,
        token=token,
    )


@router.post("/sessio", response_model=SessionResponse)
def login(
    body: LoginRequest,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> SessionResponse:
    try:
        view = identity.authenticate.execute(
            AuthenticateUserCommand(email=body.email, password=body.password)
        )
    except InvalidCredentialsError:
        raise HTTPException(status_code=401, detail="email o contrasenya incorrectes") from None
    return session_response(view, token=identity.tokens.issue(view.user_id))


@router.get("/sessio", response_model=SessionResponse)
def current_session(
    view: Annotated[SessionView, Depends(require_session)],
) -> SessionResponse:
    return session_response(view)
