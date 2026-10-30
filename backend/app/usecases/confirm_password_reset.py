"""Canvia la contrasenya amb un token d’un sol ús i tanca les sessions anteriors. No n’obre cap."""

from __future__ import annotations

from dataclasses import dataclass, replace

from app.domain.errors import InvalidPasswordResetError
from app.domain.identity import require_valid_password
from app.ports.identity import Clock, IdentityUnitOfWork, PasswordHasher
from app.usecases.request_password_reset import blind_hash


@dataclass(frozen=True)
class ConfirmPasswordResetCommand:
    token: str
    password: str


class ConfirmPasswordReset:
    def __init__(self, uow: IdentityUnitOfWork, clock: Clock, hasher: PasswordHasher) -> None:
        self._uow = uow
        self._clock = clock
        self._hasher = hasher

    def execute(self, command: ConfirmPasswordResetCommand) -> None:
        require_valid_password(command.password)
        raw = command.token.strip()
        if not raw:
            raise InvalidPasswordResetError()
        token_hash = blind_hash(raw)
        now = self._clock.now()
        pending = self._uow.password_resets.get_by_token_hash(token_hash)
        if pending is None or pending.used_at is not None or now >= pending.expires_at:
            raise InvalidPasswordResetError()
        password_hash = self._hasher.hash(command.password)
        try:
            reset = self._uow.password_resets.consume(token_hash, now)
            user = None if reset is None else self._uow.users.get_by_id(reset.user_id)
            if user is None:
                raise InvalidPasswordResetError()
            self._uow.users.save(
                replace(
                    user,
                    password_hash=password_hash,
                    session_version=user.session_version + 1,
                )
            )
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
