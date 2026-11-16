"""Emet un token de verificació i l’envia. Si el correu no surt, no en queda cap de viu."""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Literal
from uuid import UUID

from app.domain.email_verification import EmailVerification
from app.ports.email_verification_mail import (
    EmailVerificationMailer,
    EmailVerificationMessage,
    NoEmailVerificationMailer,
)
from app.ports.identity import (
    Clock,
    IdentityUnitOfWork,
    IdGenerator,
    InvitationTokenGenerator,
)
from app.usecases.mail_failure import log_mail_failure
from app.usecases.request_password_reset import blind_hash

logger = logging.getLogger(__name__)

VERIFICATION_TTL = timedelta(hours=24)
Delivery = Literal["sent", "unavailable", "failed"]


@dataclass(frozen=True)
class IssueEmailVerificationCommand:
    user_id: UUID


def emet_verificacio(
    uow: IdentityUnitOfWork,
    clock: Clock,
    ids: IdGenerator,
    tokens: InvitationTokenGenerator,
    mailer: EmailVerificationMailer,
    user_id: UUID,
    email: str,
) -> Delivery:
    now = clock.now()
    uow.email_verifications.invalidate_unused(user_id, now)
    raw = tokens.new()
    verification = EmailVerification(
        id=ids.new(),
        user_id=user_id,
        token_hash=blind_hash(raw),
        expires_at=now + VERIFICATION_TTL,
        used_at=None,
        created_at=now,
    )
    uow.email_verifications.add(verification)
    _commit(uow)
    if not mailer.configured():
        _consume(uow, verification, now)
        return "unavailable"
    try:
        mailer.send(EmailVerificationMessage(to_email=email, token=raw))
    except Exception as exc:  # noqa: BLE001
        log_mail_failure(logger, "de verificació", exc)
        _consume(uow, verification, now)
        return "failed"
    return "sent"


class IssueEmailVerification:
    def __init__(
        self,
        uow: IdentityUnitOfWork,
        clock: Clock,
        ids: IdGenerator,
        tokens: InvitationTokenGenerator,
        mailer: EmailVerificationMailer | None = None,
    ) -> None:
        self._uow = uow
        self._clock = clock
        self._ids = ids
        self._tokens = tokens
        self._mailer = mailer if mailer is not None else NoEmailVerificationMailer()

    def execute(self, command: IssueEmailVerificationCommand) -> Delivery:
        user = self._uow.users.get_by_id(command.user_id)
        if user is None or user.email_verified_at is not None:
            return "unavailable"
        return emet_verificacio(
            self._uow,
            self._clock,
            self._ids,
            self._tokens,
            self._mailer,
            user.id,
            user.email,
        )


def _consume(uow: IdentityUnitOfWork, verification: EmailVerification, now: datetime) -> None:
    uow.email_verifications.save(replace(verification, used_at=now))
    _commit(uow)


def _commit(uow: IdentityUnitOfWork) -> None:
    try:
        uow.commit()
    except Exception:
        uow.rollback()
        raise
