"""Alta d’entitat: valida HTTP i delega a RegisterEntity."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_register_entity
from app.domain.errors import DuplicateEmailError, InvalidRegistrationError
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand

router = APIRouter()


class RegisterEntityRequest(BaseModel):
    entity_name: str
    typology: str | None = None
    responsible_name: str
    email: str
    password: str = Field(min_length=1)


class RegisterEntityResponse(BaseModel):
    entity_id: UUID
    user_id: UUID
    membership_id: UUID


@router.post("/registre", status_code=201, response_model=RegisterEntityResponse)
def register(
    body: RegisterEntityRequest,
    use_case: Annotated[RegisterEntity, Depends(get_register_entity)],
) -> RegisterEntityResponse:
    try:
        result = use_case.execute(
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

    return RegisterEntityResponse(
        entity_id=result.entity_id,
        user_id=result.user_id,
        membership_id=result.membership_id,
    )
