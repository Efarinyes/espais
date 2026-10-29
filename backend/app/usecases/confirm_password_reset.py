"""Canvia la contrasenya amb un token d’un sol ús i tanca les sessions anteriors."""

from __future__ import annotations

from dataclasses import dataclass, replace

from app.domain.errors import InvalidPasswordResetError, InvalidRegistrationError
from app.ports.identity import Clock, IdentityUnitOfWork, PasswordHasher
from app.usecases.register_entity import MIN_PASSWORD_LENGTH
from app.usecases.request_password_reset import blind_hash
from app.usecases.resolve_session import ResolveSession, SessionView


@dataclass(frozen=True)
class ConfirmPasswordResetCommand:
    token: str
    password: str


class ConfirmPasswordReset:
    def __init__(self, uow: IdentityUnitOfWork, clock: Clock, hasher: PasswordHasher) -> None:
        self._uow = uow
        self._clock = clock
        self._hasher = hasher

    def execute(self, command: ConfirmPasswordResetCommand) -> SessionView:
        if len(command.password) < MIN_PASSWORD_LENGTH:
            raise InvalidRegistrationError("la contrasenya és massa curta")
        raw = command.token.strip()
        if not raw:
            raise InvalidPasswordResetError()
        now = self._clock.now()
        reset = self._uow.password_resets.get_by_token_hash(blind_hash(raw))
        if reset is None or reset.used_at is not None or now >= reset.expires_at:
            raise InvalidPasswordResetError()
        user = self._uow.users.get_by_id(reset.user_id)
        if user is None:
            raise InvalidPasswordResetError()
        try:
            self._uow.users.save(
                replace(
                    user,
                    password_hash=self._hasher.hash(command.password),
                    session_version=user.session_version + 1,
                )
            )
            self._uow.password_resets.save(replace(reset, used_at=now))
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return ResolveSession(self._uow).execute(user.id)
