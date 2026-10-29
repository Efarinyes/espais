"""Demana un enllaç de recuperació. La resposta de l’API no depèn del resultat."""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass, replace
from datetime import datetime, timedelta

from app.domain.password_reset import PasswordReset, RecoveryAttempt
from app.ports.identity import Clock, IdentityUnitOfWork, IdGenerator, InvitationTokenGenerator
from app.ports.password_reset_mail import NoPasswordResetMailer, PasswordResetMailer, PasswordResetMessage

logger = logging.getLogger(__name__)

RESET_TTL = timedelta(hours=1)
ATTEMPT_WINDOW = timedelta(hours=1)
MAX_PER_ACCOUNT = 3
MAX_PER_IP = 10


def blind_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class RequestPasswordResetCommand:
    email: str
    ip: str


class RequestPasswordReset:
    def __init__(
        self,
        uow: IdentityUnitOfWork,
        clock: Clock,
        ids: IdGenerator,
        tokens: InvitationTokenGenerator,
        mailer: PasswordResetMailer | None = None,
    ) -> None:
        self._uow = uow
        self._clock = clock
        self._ids = ids
        self._tokens = tokens
        self._mailer = mailer if mailer is not None else NoPasswordResetMailer()

    def execute(self, command: RequestPasswordResetCommand) -> None:
        email = command.email.strip().lower()
        now = self._clock.now()
        since = now - ATTEMPT_WINDOW
        subject_hash = blind_hash(email)
        ip_hash = blind_hash(command.ip.strip() or "desconeguda")
        subject_count = self._uow.recovery_attempts.count_subject_since(subject_hash, since)
        ip_count = self._uow.recovery_attempts.count_ip_since(ip_hash, since)
        self._uow.recovery_attempts.add(
            RecoveryAttempt(
                id=self._ids.new(),
                subject_hash=subject_hash,
                ip_hash=ip_hash,
                created_at=now,
            )
        )
        if subject_count >= MAX_PER_ACCOUNT or ip_count >= MAX_PER_IP:
            self._commit()
            return

        user = self._uow.users.get_by_email(email) if email else None
        if user is None:
            self._commit()
            return

        self._uow.password_resets.invalidate_unused(user.id, now)
        raw = self._tokens.new()
        reset = PasswordReset(
            id=self._ids.new(),
            user_id=user.id,
            token_hash=blind_hash(raw),
            expires_at=now + RESET_TTL,
            used_at=None,
            created_at=now,
        )
        self._uow.password_resets.add(reset)
        self._commit()

        if not self._mailer.configured():
            self._consume(reset, now)
            return
        try:
            self._mailer.send(PasswordResetMessage(to_email=email, token=raw))
        except Exception:
            logger.exception("no s’ha pogut enviar el correu de recuperació")
            self._consume(reset, now)

    def _consume(self, reset: PasswordReset, now: datetime) -> None:
        self._uow.password_resets.save(replace(reset, used_at=now))
        self._commit()

    def _commit(self) -> None:
        try:
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
