"""Adaptadors in-memory de Web Push (tests)."""

from __future__ import annotations

from dataclasses import replace
from uuid import UUID

from app.domain.errors import PushDeliveryError, PushSubscriptionExpiredError
from app.domain.notification_text import PushMessage
from app.domain.push import PushSubscription


class InMemoryPushSubscriptionRepository:
    def __init__(self, uow: InMemoryPushUnitOfWork) -> None:
        self._uow = uow

    def upsert(self, subscription: PushSubscription) -> None:
        items = self._uow._working
        for index, existing in enumerate(items):
            if existing.endpoint == subscription.endpoint:
                items[index] = replace(
                    existing,
                    entity_id=subscription.entity_id,
                    user_id=subscription.user_id,
                    p256dh=subscription.p256dh,
                    auth=subscription.auth,
                    created_at=subscription.created_at,
                )
                return
        items.append(subscription)

    def list_for_user(self, entity_id: UUID, user_id: UUID) -> list[PushSubscription]:
        return sorted(
            (
                item
                for item in self._uow._working
                if item.entity_id == entity_id and item.user_id == user_id
            ),
            key=lambda item: (item.created_at, item.id),
        )

    def delete_for_user(self, entity_id: UUID, user_id: UUID, endpoint: str) -> bool:
        before = len(self._uow._working)
        self._uow._working[:] = [
            item
            for item in self._uow._working
            if not (
                item.entity_id == entity_id and item.user_id == user_id and item.endpoint == endpoint
            )
        ]
        return len(self._uow._working) != before

    def delete_by_id(self, entity_id: UUID, subscription_id: UUID) -> bool:
        before = len(self._uow._working)
        self._uow._working[:] = [
            item
            for item in self._uow._working
            if not (item.entity_id == entity_id and item.id == subscription_id)
        ]
        return len(self._uow._working) != before

    def delete_oldest_beyond(self, entity_id: UUID, user_id: UUID, keep: int) -> int:
        mine = sorted(
            (
                item
                for item in self._uow._working
                if item.entity_id == entity_id and item.user_id == user_id
            ),
            key=lambda item: (item.created_at, item.id),
            reverse=True,
        )
        doomed = {item.id for item in mine[keep:]}
        self._uow._working[:] = [item for item in self._uow._working if item.id not in doomed]
        return len(doomed)


class InMemoryPushUnitOfWork:
    def __init__(self) -> None:
        self._committed: list[PushSubscription] = []
        self._working: list[PushSubscription] = []
        self.subscriptions = InMemoryPushSubscriptionRepository(self)

    def commit(self) -> None:
        self._committed = list(self._working)

    def rollback(self) -> None:
        self._working[:] = self._committed


class RecordingPushGateway:
    """Desa el que s’enviaria. `expired` i `failing` simulen la resposta del servei."""

    def __init__(self, *, expired: set[str] | None = None, failing: set[str] | None = None) -> None:
        self.sent: list[tuple[PushSubscription, PushMessage]] = []
        self.expired = expired or set()
        self.failing = failing or set()

    def send(self, subscription: PushSubscription, message: PushMessage) -> None:
        if subscription.endpoint in self.expired:
            raise PushSubscriptionExpiredError()
        if subscription.endpoint in self.failing:
            raise PushDeliveryError("status 500")
        self.sent.append((subscription, message))


class DownPushGateway:
    def send(self, subscription: PushSubscription, message: PushMessage) -> None:
        raise PushDeliveryError("push down")
