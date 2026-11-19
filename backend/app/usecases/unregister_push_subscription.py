"""El coordinador elimina la subscripció push d’un dels seus navegadors."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.domain.authorization import Accio, exigir_rol
from app.domain.identity import MembershipRole
from app.ports.push import PushUnitOfWork


@dataclass(frozen=True)
class UnregisterPushSubscriptionCommand:
    entity_id: UUID
    actor_user_id: UUID
    actor_role: MembershipRole
    endpoint: str


class UnregisterPushSubscription:
    def __init__(self, uow: PushUnitOfWork) -> None:
        self._uow = uow

    def execute(self, command: UnregisterPushSubscriptionCommand) -> None:
        """Idempotent: una subscripció que no és seva o no existeix no es toca ni falla."""
        exigir_rol(command.actor_role, Accio.GESTIONAR_PUSH)
        try:
            self._uow.subscriptions.delete_for_user(
                command.entity_id, command.actor_user_id, command.endpoint
            )
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
