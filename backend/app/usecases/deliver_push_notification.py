"""Envia un avís ja persistit als navegadors subscrits del coordinador.

L’enviament no confirma res: ni que el navegador l’hagi rebut ni que s’hagi llegit.
Només la lectura dins d’Espais omple `read_at`.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.domain.errors import PushSubscriptionExpiredError
from app.domain.notification import Notification
from app.domain.notification_text import missatge_push
from app.ports.push import PushGateway, PushUnitOfWork

logger = logging.getLogger("espais.push")


@dataclass(frozen=True)
class DeliverPushNotificationResult:
    accepted: int
    removed: int
    failed: int


class DeliverPushNotification:
    def __init__(self, uow: PushUnitOfWork, gateway: PushGateway) -> None:
        self._uow = uow
        self._gateway = gateway

    def execute(self, notification: Notification) -> DeliverPushNotificationResult:
        subscriptions = self._uow.subscriptions.list_for_user(
            notification.entity_id, notification.user_id
        )
        message = missatge_push(notification)
        accepted = 0
        removed = 0
        failed = 0
        for subscription in subscriptions:
            try:
                self._gateway.send(subscription, message)
                accepted += 1
            except PushSubscriptionExpiredError:
                if self._uow.subscriptions.delete_by_id(subscription.entity_id, subscription.id):
                    removed += 1
            except Exception as exc:  # noqa: BLE001
                failed += 1
                logger.error("no s’ha pogut enviar el push (%s)", type(exc).__name__)
        try:
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return DeliverPushNotificationResult(accepted=accepted, removed=removed, failed=failed)
