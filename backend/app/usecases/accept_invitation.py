"""Accepta una invitació: crea el compte de coordinador i la membership."""

from __future__ import annotations

from dataclasses import dataclass, replace
from uuid import UUID

from app.domain.errors import DuplicateEmailError, InvalidRegistrationError
from app.domain.identity import Membership, MembershipRole, User
from app.domain.invitation import require_pending
from app.ports.identity import Clock, IdentityUnitOfWork, IdGenerator, PasswordHasher
from app.usecases.register_entity import MIN_PASSWORD_LENGTH


@dataclass(frozen=True)
class AcceptInvitationCommand:
    token: str
    name: str
    password: str


@dataclass(frozen=True)
class AcceptInvitationResult:
    user_id: UUID
    membership_id: UUID
    entity_id: UUID


class AcceptInvitation:
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

    def execute(self, command: AcceptInvitationCommand) -> AcceptInvitationResult:
        name = command.name.strip()
        if not name:
            raise InvalidRegistrationError("el nom del coordinador és obligatori")
        if len(command.password) < MIN_PASSWORD_LENGTH:
            raise InvalidRegistrationError("la contrasenya és massa curta")

        invitation = require_pending(
            self._uow.invitations.get_by_token(command.token.strip()),
            self._clock.now(),
        )

        if self._uow.users.get_by_email(invitation.email) is not None:
            raise DuplicateEmailError(invitation.email)

        now = self._clock.now()
        user_id = self._ids.new()
        membership_id = self._ids.new()
        user = User(
            id=user_id,
            name=name,
            email=invitation.email,
            password_hash=self._hasher.hash(command.password),
            created_at=now,
        )
        membership = Membership(
            id=membership_id,
            user_id=user_id,
            entity_id=invitation.entity_id,
            role=MembershipRole.COORDINATOR,
        )
        accepted = replace(invitation, accepted_at=now)

        try:
            self._uow.users.add(user)
            self._uow.memberships.add(membership)
            self._uow.invitations.save(accepted)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise

        return AcceptInvitationResult(
            user_id=user_id,
            membership_id=membership_id,
            entity_id=invitation.entity_id,
        )
