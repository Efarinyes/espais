"""Alta d’entitat: crea el compte provisional i envia la verificació. No obre sessió."""

from collections.abc import Callable
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.client_ip import client_ip
from app.api.deps import (
    IdentityHttp,
    get_email_verification_request,
    get_identity_http,
)
from app.domain.errors import (
    DuplicateEmailError,
    InvalidEmailVerificationError,
    InvalidRegistrationError,
)
from app.usecases.confirm_email_verification import ConfirmEmailVerificationCommand
from app.usecases.issue_email_verification import IssueEmailVerificationCommand
from app.usecases.register_entity import RegisterEntityCommand
from app.usecases.request_email_verification import RequestEmailVerificationCommand

router = APIRouter()

DETALL_REGISTRE_NO_COMPLETAT = (
    "No s’ha pogut completar el registre. Revisa les dades o inicia la sessió."
)
DETALL_ENVIAT = (
    "T’hem enviat un correu per verificar l’adreça. "
    "Obre l’enllaç per activar el compte. Caduca al cap de 24 hores."
)
DETALL_SENSE_CORREU = (
    "El compte s’ha creat, però no hem pogut enviar el correu de verificació. Demana’n un altre."
)
DETALL_REENVIAMENT = (
    "Si aquest correu té un registre pendent de verificar, rebràs un enllaç. "
    "Caduca al cap de 24 hores."
)
DETALL_ENLLAC = "Aquest enllaç no és vàlid o ha caducat. Demana’n un de nou."
DETALL_VERIFICAT = (
    "El correu s’ha verificat i l’entitat ja està activa. Ara pots iniciar sessió."
)


class RegisterEntityRequest(BaseModel):
    entity_name: str
    typology: str | None = None
    responsible_name: str
    email: str
    password: str = Field(min_length=1)


class RegisterEntityResponse(BaseModel):
    detall: str
    lliurament: Literal["sent", "unavailable", "failed"]


class VerificationRequest(BaseModel):
    email: str = ""


class VerificationResponse(BaseModel):
    detall: str


class VerificationConfirmRequest(BaseModel):
    token: str = ""


@router.post("/registre", status_code=201, response_model=RegisterEntityResponse)
def register(
    body: RegisterEntityRequest,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> RegisterEntityResponse:
    try:
        result = identity.register.execute(
            RegisterEntityCommand(
                entity_name=body.entity_name,
                typology=body.typology,
                responsible_name=body.responsible_name,
                email=body.email,
                password=body.password,
            )
        )
    except DuplicateEmailError:
        raise HTTPException(status_code=400, detail=DETALL_REGISTRE_NO_COMPLETAT) from None
    except InvalidRegistrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    lliurament = identity.issue_verification.execute(
        IssueEmailVerificationCommand(user_id=result.user_id)
    )
    if lliurament == "sent":
        return RegisterEntityResponse(detall=DETALL_ENVIAT, lliurament=lliurament)
    return RegisterEntityResponse(detall=DETALL_SENSE_CORREU, lliurament=lliurament)


@router.post("/registre/verificacio", response_model=VerificationResponse)
def request_verification(
    body: VerificationRequest,
    request: Request,
    background: BackgroundTasks,
    run: Annotated[
        Callable[[RequestEmailVerificationCommand], None],
        Depends(get_email_verification_request),
    ],
) -> VerificationResponse:
    background.add_task(
        run,
        RequestEmailVerificationCommand(email=body.email, ip=client_ip(request)),
    )
    return VerificationResponse(detall=DETALL_REENVIAMENT)


@router.post("/registre/verificacio/confirmacio", response_model=VerificationResponse)
def confirm_verification(
    body: VerificationConfirmRequest,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> VerificationResponse:
    try:
        identity.confirm_verification.execute(ConfirmEmailVerificationCommand(token=body.token))
    except InvalidEmailVerificationError:
        raise HTTPException(status_code=410, detail=DETALL_ENLLAC) from None
    return VerificationResponse(detall=DETALL_VERIFICAT)
