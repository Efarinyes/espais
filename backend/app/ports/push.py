"""Ports de Web Push: subscripcions acotades a l’usuari i enviament al servei de push."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.domain.notification_text import PushMessage
from app.domain.push import PushSubscription


class PushSubscriptionRepository(Protocol):
    def upsert(self, subscription: PushSubscription) -> None:
        """Insereix o reassigna per endpoint: un navegador només té una subscripció."""
        ...

    def list_for_user(self, entity_id: UUID, user_id: UUID) -> list[PushSubscription]: ...

    def delete_for_user(self, entity_id: UUID, user_id: UUID, endpoint: str) -> bool: ...

    def delete_by_id(self, entity_id: UUID, subscription_id: UUID) -> bool: ...

    def delete_oldest_beyond(self, entity_id: UUID, user_id: UUID, keep: int) -> int: ...


class PushUnitOfWork(Protocol):
    subscriptions: PushSubscriptionRepository

    def commit(self) -> None: ...

    def rollback(self) -> None: ...


class PushGateway(Protocol):
    def send(self, subscription: PushSubscription, message: PushMessage) -> None:
        """Llança `PushSubscriptionExpiredError` si la subscripció ja no existeix i
        `PushDeliveryError` per qualsevol altra fallada."""
        ...
