"""El responsable convida un coordinador. Sense SMTP: torna un token copiable."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from app.domain.errors import DuplicateEmailError, ForbiddenError, InvalidRegistrationError
from app.domain.identity import MembershipRole
from app.domain.invitation import Invitation
from app.ports.identity import Clock, IdentityUnitOfWork, IdGenerator, InvitationTokenGenerator

INVITATION_TTL_DAYS = 14


@dataclass(frozen=True)
class InviteCoordinatorCommand:
    entity_id: UUID
    actor_role: MembershipRole
    email: str


@dataclass(frozen=True)
class InviteCoordinatorResult:
    email: str
    token: str
    expires_at: datetime


class InviteCoordinator:
    def __init__(
        self,
        uow: IdentityUnitOfWork,
        clock: Clock,
        ids: IdGenerator,
        tokens: InvitationTokenGenerator,
    ) -> None:
        self._uow = uow
        self._clock = clock
        self._ids = ids
        self._tokens = tokens

    def execute(self, command: InviteCoordinatorCommand) -> InviteCoordinatorResult:
        if command.actor_role != MembershipRole.RESPONSIBLE:
            raise ForbiddenError()

        email = command.email.strip().lower()
        if not email:
            raise InvalidRegistrationError("l’email és obligatori")

        if self._uow.users.get_by_email(email) is not None:
            raise DuplicateEmailError(email)

        now = self._clock.now()
        expires_at = now + timedelta(days=INVITATION_TTL_DAYS)
        token = self._tokens.new()
        invitation = Invitation(
            id=self._ids.new(),
            entity_id=command.entity_id,
            email=email,
            token=token,
            expires_at=expires_at,
            accepted_at=None,
            created_at=now,
        )
        try:
            self._uow.invitations.add(invitation)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise

        return InviteCoordinatorResult(email=email, token=token, expires_at=expires_at)
