"""Comprova les credencials i obre un repte. No concedeix la sessió."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.domain.errors import LoginConnectionError
from app.ports.identity import Clock, IdentityUnitOfWork, IdGenerator, PasswordHasher
from app.ports.login_verification import LoginChallenges, LoginChannel
from app.usecases.authenticate_user import AuthenticateUser, AuthenticateUserCommand


class LoginCodeFactory(Protocol):
    def new(self) -> str: ...


@dataclass(frozen=True)
class BeginLoginVerificationCommand:
    email: str
    password: str
    channel: str
    ip: str


@dataclass(frozen=True)
class LoginChallengeView:
    challenge_id: UUID
    expires_at: datetime


class BeginLoginVerification:
    def __init__(
        self,
        uow: IdentityUnitOfWork,
        hasher: PasswordHasher,
        clock: Clock,
        ids: IdGenerator,
        codes: LoginCodeFactory,
        challenges: LoginChallenges,
        channel: LoginChannel,
    ) -> None:
        self._authenticate = AuthenticateUser(uow, hasher)
        self._clock = clock
        self._ids = ids
        self._codes = codes
        self._challenges = challenges
        self._channel = channel

    def execute(self, command: BeginLoginVerificationCommand) -> LoginChallengeView:
        view = self._authenticate.execute(
            AuthenticateUserCommand(email=command.email, password=command.password)
        )
        channel = command.channel.strip()
        if not channel or not self._channel.live(channel):
            raise LoginConnectionError()
        code = self._codes.new()
        challenge_id = self._ids.new()
        expires_at = self._challenges.open(
            challenge_id=challenge_id,
            user_id=view.user_id,
            channel=channel,
            ip=command.ip,
            code=code,
            now=self._clock.now(),
        )
        if not self._channel.reserve(channel, challenge_id, code, expires_at):
            self._challenges.drop(challenge_id)
            raise LoginConnectionError()
        return LoginChallengeView(challenge_id=challenge_id, expires_at=expires_at)

    def abandon(self, challenge_id: UUID, channel: str) -> None:
        self._challenges.drop(challenge_id)
        self._channel.clear(channel.strip())
