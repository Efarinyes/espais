"""HTTP de Web Push: configuració pública i subscripcions del coordinador.

El router no valida l’endpoint ni decideix permisos: ho fan els casos d’ús.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import PushHttp, get_push_http, require_session
from app.domain.authorization import Accio, exigir_rol
from app.domain.errors import ForbiddenError, InvalidPushSubscriptionError
from app.usecases.register_push_subscription import RegisterPushSubscriptionCommand
from app.usecases.resolve_session import SessionView
from app.usecases.unregister_push_subscription import UnregisterPushSubscriptionCommand

router = APIRouter()


class PushConfigResponse(BaseModel):
    enabled: bool
    public_key: str | None


class PushKeys(BaseModel):
    p256dh: str = Field(max_length=255)
    auth: str = Field(max_length=255)


class PushSubscriptionRequest(BaseModel):
    endpoint: str = Field(max_length=2048)
    keys: PushKeys


class PushUnsubscribeRequest(BaseModel):
    endpoint: str = Field(max_length=2048)


@router.get("/push/configuracio", response_model=PushConfigResponse)
def push_config(
    view: Annotated[SessionView, Depends(require_session)],
    push: Annotated[PushHttp, Depends(get_push_http)],
) -> PushConfigResponse:
    try:
        exigir_rol(view.role, Accio.GESTIONAR_PUSH)
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    if push.config is None:
        return PushConfigResponse(enabled=False, public_key=None)
    return PushConfigResponse(enabled=True, public_key=push.config.public_key)


@router.put("/push/subscripcio", status_code=204)
def register_subscription(
    body: PushSubscriptionRequest,
    view: Annotated[SessionView, Depends(require_session)],
    push: Annotated[PushHttp, Depends(get_push_http)],
) -> None:
    if push.config is None:
        raise HTTPException(status_code=503, detail="les notificacions del dispositiu no estan activades")
    try:
        push.register.execute(
            RegisterPushSubscriptionCommand(
                entity_id=view.entity_id,
                actor_user_id=view.user_id,
                actor_role=view.role,
                endpoint=body.endpoint,
                p256dh=body.keys.p256dh,
                auth=body.keys.auth,
            )
        )
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    except InvalidPushSubscriptionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None


@router.post("/push/subscripcio/cancelacio", status_code=204)
def unregister_subscription(
    body: PushUnsubscribeRequest,
    view: Annotated[SessionView, Depends(require_session)],
    push: Annotated[PushHttp, Depends(get_push_http)],
) -> None:
    try:
        push.unregister.execute(
            UnregisterPushSubscriptionCommand(
                entity_id=view.entity_id,
                actor_user_id=view.user_id,
                actor_role=view.role,
                endpoint=body.endpoint,
            )
        )
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
