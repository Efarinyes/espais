"""Inici de sessió amb email i contrasenya. Un compte, una entitat (v1)."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.errors import InvalidCredentialsError
from app.ports.identity import IdentityUnitOfWork, PasswordHasher
from app.usecases.resolve_session import ResolveSession, SessionView


@dataclass(frozen=True)
class AuthenticateUserCommand:
    email: str
    password: str


class AuthenticateUser:
    def __init__(self, uow: IdentityUnitOfWork, hasher: PasswordHasher) -> None:
        self._uow = uow
        self._hasher = hasher

    def execute(self, command: AuthenticateUserCommand) -> SessionView:
        email = command.email.strip().lower()
        user = self._uow.users.get_by_email(email)
        if user is None or not self._hasher.verify(command.password, user.password_hash):
            raise InvalidCredentialsError()
        return ResolveSession(self._uow).execute(user.id)
