"""Recuperació de compte. La sol·licitud no diu si el correu existeix."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.client_ip import client_ip
from app.api.deps import IdentityHttp, get_identity_http
from app.api.session import SessionResponse, session_response
from app.domain.errors import InvalidPasswordResetError, InvalidRegistrationError
from app.usecases.confirm_password_reset import ConfirmPasswordResetCommand
from app.usecases.request_password_reset import RequestPasswordResetCommand

router = APIRouter()

DETALL_RECUPERACIO = (
    "Si aquest correu té un compte, rebràs un enllaç per triar una contrasenya nova. "
    "Caduca al cap d’una hora."
)
DETALL_ENLLAC = "Aquest enllaç no és vàlid o ha caducat. Demana’n un de nou."


class RecoveryRequest(BaseModel):
    email: str = ""


class RecoveryRequestResponse(BaseModel):
    detall: str


class RecoveryConfirmRequest(BaseModel):
    token: str = ""
    password: str = Field(min_length=1)


@router.post("/recuperacio", response_model=RecoveryRequestResponse)
def request_recovery(
    body: RecoveryRequest,
    request: Request,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> RecoveryRequestResponse:
    identity.request_reset.execute(
        RequestPasswordResetCommand(email=body.email, ip=client_ip(request))
    )
    return RecoveryRequestResponse(detall=DETALL_RECUPERACIO)


@router.post("/recuperacio/confirmacio", response_model=SessionResponse)
def confirm_recovery(
    body: RecoveryConfirmRequest,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> SessionResponse:
    try:
        view = identity.confirm_reset.execute(
            ConfirmPasswordResetCommand(token=body.token, password=body.password)
        )
    except InvalidPasswordResetError:
        raise HTTPException(status_code=400, detail=DETALL_ENLLAC) from None
    except InvalidRegistrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    return session_response(view, token=identity.tokens.issue(view.user_id, view.session_version))
