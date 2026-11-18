"""Sessió: login, lectura del principal i tancament d’un Bearer. L’entity_id ve de la membership."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from app.adapters.sqlalchemy.revocation import SqlAlchemyRevocationUnitOfWork
from app.api.client_ip import client_ip
from app.api.deps import (
    IdentityHttp,
    bearer_scheme,
    get_identity_http,
    get_session_factory,
    get_token_issuer,
    require_session,
)
from app.domain.errors import (
    EmailNotVerifiedError,
    InvalidCredentialsError,
    InvalidLoginCodeError,
    LoginChallengeClosedError,
    LoginConnectionError,
    LoginRateLimitedError,
    SessionNotFoundError,
)
from app.domain.identity import MembershipRole
from app.usecases.begin_login_verification import BeginLoginVerificationCommand
from app.usecases.close_session import CloseSession
from app.usecases.confirm_login_verification import ConfirmLoginVerificationCommand
from app.usecases.resolve_session import SessionView

router = APIRouter()

DETALL_SENSE_VERIFICAR = "Verifica el correu abans d’iniciar sessió."
DETALL_CONNEXIO = "La connexió de verificació no és vàlida. Torna a iniciar el procés."
DETALL_CODI = "El codi no és correcte."
DETALL_LIMIT = {
    "cooldown": "Ja hem enviat un codi a aquesta finestra. Espera uns segons per demanar-ne un altre.",
    "channel": "Massa codis en aquesta finestra. Torna-ho a provar més tard.",
    "ip": "Massa codis demanats. Torna-ho a provar més tard.",
}
DETALL_TANCAT = {
    "expired": "El codi ha caducat. Torna a iniciar el procés.",
    "reused": "Aquest codi ja s’ha fet servir. Torna a iniciar el procés.",
    "locked": "Has exhaurit els intents. Torna a iniciar el procés.",
    "superseded": "Aquest codi ja no és vàlid. Torna a iniciar el procés.",
    "disconnected": "S’ha tallat la connexió. Torna a iniciar el procés.",
    "channel": "La verificació no correspon a aquesta connexió. Torna a iniciar el procés.",
}


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)
    channel: str = Field(default="", max_length=200)


class LoginChallengeResponse(BaseModel):
    challenge_id: UUID
    expires_at: datetime


class VerifyLoginRequest(BaseModel):
    challenge_id: UUID
    code: str = Field(min_length=1, max_length=32)
    channel: str = Field(min_length=1, max_length=200)


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


@router.post("/sessio", response_model=LoginChallengeResponse)
async def login(
    body: LoginRequest,
    request: Request,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> LoginChallengeResponse:
    channel = body.channel.strip()
    try:
        started = identity.begin_login.execute(
            BeginLoginVerificationCommand(
                email=body.email,
                password=body.password,
                channel=channel,
                ip=client_ip(request),
            )
        )
    except InvalidCredentialsError:
        raise HTTPException(status_code=401, detail="email o contrasenya incorrectes") from None
    except EmailNotVerifiedError:
        raise HTTPException(status_code=403, detail=DETALL_SENSE_VERIFICAR) from None
    except LoginRateLimitedError as exc:
        raise HTTPException(status_code=429, detail=DETALL_LIMIT[exc.scope]) from None
    except LoginConnectionError:
        raise HTTPException(status_code=400, detail=DETALL_CONNEXIO) from None
    try:
        await request.app.state.login_hub.emit(channel)
    except LoginConnectionError:
        identity.begin_login.abandon(started.challenge_id, channel)
        raise HTTPException(status_code=400, detail=DETALL_CONNEXIO) from None
    return LoginChallengeResponse(challenge_id=started.challenge_id, expires_at=started.expires_at)


@router.post("/sessio/verificacio", response_model=SessionResponse)
def verify_login(
    body: VerifyLoginRequest,
    identity: Annotated[IdentityHttp, Depends(get_identity_http)],
) -> SessionResponse:
    try:
        view = identity.confirm_login.execute(
            ConfirmLoginVerificationCommand(
                challenge_id=body.challenge_id,
                code=body.code,
                channel=body.channel,
            )
        )
    except InvalidLoginCodeError:
        raise HTTPException(status_code=400, detail=DETALL_CODI) from None
    except LoginChallengeClosedError as exc:
        raise HTTPException(
            status_code=410,
            detail=DETALL_TANCAT.get(exc.reason, DETALL_TANCAT["reused"]),
        ) from None
    except (SessionNotFoundError, EmailNotVerifiedError):
        raise HTTPException(status_code=401, detail="sessió invàlida") from None
    return session_response(view, token=identity.tokens.issue(view.user_id, view.session_version))


@router.get("/sessio", response_model=SessionResponse)
def current_session(
    view: Annotated[SessionView, Depends(require_session)],
) -> SessionResponse:
    return session_response(view)


@router.post("/sessio/tancament", status_code=204)
def close_session(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    _view: Annotated[SessionView, Depends(require_session)],
) -> None:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="cal iniciar sessió")
    uow = SqlAlchemyRevocationUnitOfWork(get_session_factory(request))
    try:
        CloseSession(uow, get_token_issuer(request)).execute(creds.credentials)
    except SessionNotFoundError:
        raise HTTPException(status_code=401, detail="sessió invàlida") from None
    finally:
        uow.close()
