"""Valida el codi del repte i resol la sessió. El token el continua emetent el router."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.domain.errors import LoginChallengeClosedError
from app.ports.identity import Clock, IdentityUnitOfWork
from app.ports.login_verification import LoginChallenges, LoginChannel
from app.usecases.resolve_session import ResolveSession, SessionView


@dataclass(frozen=True)
class ConfirmLoginVerificationCommand:
    challenge_id: UUID
    code: str
    channel: str


class ConfirmLoginVerification:
    def __init__(
        self,
        uow: IdentityUnitOfWork,
        clock: Clock,
        challenges: LoginChallenges,
        channel: LoginChannel,
    ) -> None:
        self._uow = uow
        self._clock = clock
        self._challenges = challenges
        self._channel = channel

    def execute(self, command: ConfirmLoginVerificationCommand) -> SessionView:
        channel = command.channel.strip()
        if not channel or not self._channel.live(channel):
            raise LoginChallengeClosedError("disconnected")
        user_id = self._challenges.consume(
            challenge_id=command.challenge_id,
            channel=channel,
            code=command.code.strip(),
            now=self._clock.now(),
        )
        self._channel.clear(channel)
        return ResolveSession(self._uow).execute(user_id)
