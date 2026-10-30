"""El responsable convida un coordinador. El correu és un port; la invitació no es desfa si falla."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal
from uuid import UUID

from app.domain.errors import DuplicateEmailError, ForbiddenError, InvalidRegistrationError
from app.domain.identity import MembershipRole
from app.domain.invitation import Invitation
from app.ports.identity import Clock, IdentityUnitOfWork, IdGenerator, InvitationTokenGenerator
from app.ports.invitation_mail import InvitationMailer, InvitationMessage, NoInvitationMailer
from app.usecases.mail_failure import log_mail_failure

logger = logging.getLogger(__name__)

Delivery = Literal["sent", "unavailable", "failed"]

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
    delivery: Delivery


class InviteCoordinator:
    def __init__(
        self,
        uow: IdentityUnitOfWork,
        clock: Clock,
        ids: IdGenerator,
        tokens: InvitationTokenGenerator,
        mailer: InvitationMailer | None = None,
    ) -> None:
        self._uow = uow
        self._clock = clock
        self._ids = ids
        self._tokens = tokens
        self._mailer = mailer if mailer is not None else NoInvitationMailer()

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

        entity = self._uow.entities.get_by_id(command.entity_id)
        entity_name = entity.name if entity is not None else "Espais"
        delivery: Delivery = "unavailable"
        if self._mailer.configured():
            try:
                self._mailer.send(
                    InvitationMessage(to_email=email, entity_name=entity_name, token=token)
                )
                delivery = "sent"
            except Exception as exc:  # noqa: BLE001
                log_mail_failure(logger, "d’invitació", exc)
                delivery = "failed"

        return InviteCoordinatorResult(
            email=email,
            token=token,
            expires_at=expires_at,
            delivery=delivery,
        )
