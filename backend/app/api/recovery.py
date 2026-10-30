"""Recuperació de compte. La sol·licitud no diu si el correu existeix i la confirmació no obre sessió."""

from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.client_ip import client_ip
from app.api.deps import IdentityHttp, get_identity_http, get_password_reset_request
from app.domain.errors import InvalidPasswordResetError, InvalidRegistrationError
from app.usecases.confirm_password_reset import ConfirmPasswordResetCommand
from app.usecases.request_password_reset import RequestPasswordResetCommand

router = APIRouter()

DETALL_RECUPERACIO = (
    "Si aquest correu té un compte, rebràs un enllaç per triar una contrasenya nova. "
    "Caduca al cap d’una hora."
)
DETALL_ENLLAC = "Aquest enllaç no és vàlid o ha caducat. Demana’n un de nou."
DETALL_CANVI = "La contrasenya s’ha actualitzat correctament. Ara pots iniciar sessió."


class RecoveryRequest(BaseModel):
    email: str = ""


class RecoveryResponse(BaseModel):
    detall: str


class RecoveryConfirmRequest(BaseModel):
    token: str = ""
    password: str = Field(min_length=1)


@router.post("/recuperacio", response_model=RecoveryResponse)
def request_recovery(
    body: RecoveryRequest,
    request: Request,
    background: BackgroundTasks,
    run: Annotated[Callable[[RequestPasswordResetCommand], None], Depends(get_password_reset_request)],
) -> RecoveryResponse:
    background.add_task(run, RequestPasswordResetCommand(email=body.email, ip=client_ip(request)))
    return RecoveryResponse(detall=DETALL_RECUPERACIO)


@router.post("/recuperacio/confirmacio", response_model=RecoveryResponse)
def confirm_recovery(
    body: RecoveryConfirmRequest,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> RecoveryResponse:
    try:
        identity.confirm_reset.execute(
            ConfirmPasswordResetCommand(token=body.token, password=body.password)
        )
    except InvalidPasswordResetError:
        raise HTTPException(status_code=410, detail=DETALL_ENLLAC) from None
    except InvalidRegistrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    return RecoveryResponse(detall=DETALL_CANVI)
