"""Alta atòmica d’entitat + primer responsable. Sense espais ni coordinadors."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.domain.errors import DuplicateEmailError, InvalidRegistrationError
from app.domain.identity import (
    DEFAULT_ENTITY_PALETTE,
    Entity,
    Membership,
    MembershipRole,
    User,
)
from app.ports.identity import Clock, IdentityUnitOfWork, IdGenerator, PasswordHasher

MIN_PASSWORD_LENGTH = 8


@dataclass(frozen=True)
class RegisterEntityCommand:
    entity_name: str
    typology: str | None
    responsible_name: str
    email: str
    password: str


@dataclass(frozen=True)
class RegisterEntityResult:
    entity_id: UUID
    user_id: UUID
    membership_id: UUID


class RegisterEntity:
    def __init__(
        self,
        uow: IdentityUnitOfWork,
        clock: Clock,
        ids: IdGenerator,
        hasher: PasswordHasher,
    ) -> None:
        self._uow = uow
        self._clock = clock
        self._ids = ids
        self._hasher = hasher

    def execute(self, command: RegisterEntityCommand) -> RegisterEntityResult:
        entity_name = command.entity_name.strip()
        responsible_name = command.responsible_name.strip()
        email = command.email.strip().lower()
        typology = command.typology.strip() if command.typology else None
        if typology == "":
            typology = None

        if not entity_name:
            raise InvalidRegistrationError("el nom de l’entitat és obligatori")
        if not responsible_name:
            raise InvalidRegistrationError("el nom del responsable és obligatori")
        if not email:
            raise InvalidRegistrationError("l’email és obligatori")
        if len(command.password) < MIN_PASSWORD_LENGTH:
            raise InvalidRegistrationError("la contrasenya és massa curta")

        if self._uow.users.get_by_email(email) is not None:
            raise DuplicateEmailError(email)

        now = self._clock.now()
        entity_id = self._ids.new()
        user_id = self._ids.new()
        membership_id = self._ids.new()

        entity = Entity(
            id=entity_id,
            name=entity_name,
            typology=typology,
            created_at=now,
            palette=DEFAULT_ENTITY_PALETTE,
        )
        user = User(
            id=user_id,
            name=responsible_name,
            email=email,
            password_hash=self._hasher.hash(command.password),
            created_at=now,
        )
        membership = Membership(
            id=membership_id,
            user_id=user_id,
            entity_id=entity_id,
            role=MembershipRole.RESPONSIBLE,
        )

        try:
            self._uow.entities.add(entity)
            self._uow.users.add(user)
            self._uow.memberships.add(membership)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise

        return RegisterEntityResult(
            entity_id=entity_id,
            user_id=user_id,
            membership_id=membership_id,
        )
