"""Torna a demanar l’enllaç de verificació. La resposta de l’API no depèn del resultat."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.domain.password_reset import RecoveryAttempt
from app.ports.email_verification_mail import (
    EmailVerificationMailer,
    NoEmailVerificationMailer,
)
from app.ports.identity import (
    Clock,
    IdentityUnitOfWork,
    IdGenerator,
    InvitationTokenGenerator,
)
from app.usecases.issue_email_verification import emet_verificacio
from app.usecases.request_password_reset import (
    ATTEMPT_WINDOW,
    MAX_PER_ACCOUNT,
    MAX_PER_IP,
    blind_hash,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RequestEmailVerificationCommand:
    email: str
    ip: str


class RequestEmailVerification:
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

    def execute(self, command: RequestEmailVerificationCommand) -> None:
        email = command.email.strip().lower()
        now = self._clock.now()
        since = now - ATTEMPT_WINDOW
        subject_hash = blind_hash(f"verificacio:{email}")
        ip_hash = blind_hash(f"verificacio:{command.ip.strip() or 'desconeguda'}")
        self._uow.recovery_attempts.add(
            RecoveryAttempt(
                id=self._ids.new(),
                subject_hash=subject_hash,
                ip_hash=ip_hash,
                created_at=now,
            )
        )
        subject_count = self._uow.recovery_attempts.count_subject_since(subject_hash, since)
        ip_count = self._uow.recovery_attempts.count_ip_since(ip_hash, since)
        if subject_count > MAX_PER_ACCOUNT or ip_count > MAX_PER_IP or not email:
            self._commit()
            return

        user = self._uow.users.get_by_email(email)
        if user is None or user.email_verified_at is not None:
            self._commit()
            return

        emet_verificacio(
            self._uow,
            self._clock,
            self._ids,
            self._tokens,
            self._mailer,
            user.id,
            user.email,
        )

    def _commit(self) -> None:
        try:
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise


def run_request(use_case: RequestEmailVerification, command: RequestEmailVerificationCommand) -> None:
    try:
        use_case.execute(command)
    except Exception as exc:  # noqa: BLE001
        logger.error("no s’ha pogut reenviar la verificació (%s)", type(exc).__name__)
