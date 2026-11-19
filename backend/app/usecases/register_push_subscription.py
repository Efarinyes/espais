"""El coordinador registra la subscripció push del seu navegador."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.domain.authorization import Accio, exigir_rol
from app.domain.identity import MembershipRole
from app.domain.push import (
    DEFAULT_PUSH_HOST_SUFFIXES,
    MAX_SUBSCRIPTIONS_PER_USER,
    PushSubscription,
    validate_push_subscription,
)
from app.ports.identity import Clock, IdGenerator
from app.ports.push import PushUnitOfWork


@dataclass(frozen=True)
class RegisterPushSubscriptionCommand:
    entity_id: UUID
    actor_user_id: UUID
    actor_role: MembershipRole
    endpoint: str
    p256dh: str
    auth: str


class RegisterPushSubscription:
    def __init__(
        self,
        uow: PushUnitOfWork,
        clock: Clock,
        ids: IdGenerator,
        allowed_host_suffixes: tuple[str, ...] = DEFAULT_PUSH_HOST_SUFFIXES,
    ) -> None:
        self._uow = uow
        self._clock = clock
        self._ids = ids
        self._allowed_host_suffixes = allowed_host_suffixes

    def execute(self, command: RegisterPushSubscriptionCommand) -> None:
        exigir_rol(command.actor_role, Accio.GESTIONAR_PUSH)
        validate_push_subscription(
            command.endpoint,
            command.p256dh,
            command.auth,
            allowed_host_suffixes=self._allowed_host_suffixes,
        )
        subscription = PushSubscription(
            id=self._ids.new(),
            entity_id=command.entity_id,
            user_id=command.actor_user_id,
            endpoint=command.endpoint,
            p256dh=command.p256dh,
            auth=command.auth,
            created_at=self._clock.now(),
        )
        try:
            self._uow.subscriptions.upsert(subscription)
            self._uow.subscriptions.delete_oldest_beyond(
                command.entity_id, command.actor_user_id, MAX_SUBSCRIPTIONS_PER_USER
            )
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
