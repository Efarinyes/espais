"""Alta d’entitat: valida HTTP, RegisterEntity, i inicia sessió."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import IdentityHttp, get_identity_http
from app.api.session import SessionResponse, session_response
from app.domain.errors import DuplicateEmailError, InvalidRegistrationError
from app.usecases.register_entity import RegisterEntityCommand

router = APIRouter()


class RegisterEntityRequest(BaseModel):
    entity_name: str
    typology: str | None = None
    responsible_name: str
    email: str
    password: str = Field(min_length=1)


class RegisterEntityResponse(SessionResponse):
    membership_id: UUID
    token: str


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
        raise HTTPException(status_code=409, detail="aquest email ja està registrat") from None
    except InvalidRegistrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    view = identity.resolve.execute(result.user_id)
    token = identity.tokens.issue(result.user_id)
    base = session_response(view, token=token)
    return RegisterEntityResponse(membership_id=result.membership_id, **base.model_dump())
