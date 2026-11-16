"""Verifica el correu i activa el compte i l’entitat. No obre sessió."""

from __future__ import annotations

from dataclasses import dataclass, replace

from app.domain.errors import InvalidEmailVerificationError
from app.ports.identity import Clock, IdentityUnitOfWork
from app.usecases.request_password_reset import blind_hash


@dataclass(frozen=True)
class ConfirmEmailVerificationCommand:
    token: str


class ConfirmEmailVerification:
    def __init__(self, uow: IdentityUnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    def execute(self, command: ConfirmEmailVerificationCommand) -> None:
        raw = command.token.strip()
        if not raw:
            raise InvalidEmailVerificationError()
        token_hash = blind_hash(raw)
        now = self._clock.now()
        pending = self._uow.email_verifications.get_by_token_hash(token_hash)
        if pending is None or pending.used_at is not None or now >= pending.expires_at:
            raise InvalidEmailVerificationError()
        try:
            verification = self._uow.email_verifications.consume(token_hash, now)
            user = None if verification is None else self._uow.users.get_by_id(verification.user_id)
            membership = None if user is None else self._uow.memberships.get_by_user_id(user.id)
            entity = None if membership is None else self._uow.entities.get_by_id(membership.entity_id)
            if user is None or entity is None:
                raise InvalidEmailVerificationError()
            self._uow.users.save(replace(user, email_verified_at=user.email_verified_at or now))
            if entity.activated_at is None:
                self._uow.entities.save(replace(entity, activated_at=now))
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
