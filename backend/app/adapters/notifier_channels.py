"""Canals d’avís: correu i Web Push comparteixen el port `Notifier`."""

from __future__ import annotations

import logging
from concurrent.futures import Executor, ThreadPoolExecutor

from sqlalchemy.orm import sessionmaker

from app.adapters.sqlalchemy.push import SqlAlchemyPushUnitOfWork
from app.domain.notification import Notification
from app.ports.notifications import Notifier
from app.ports.push import PushGateway
from app.usecases.deliver_push_notification import DeliverPushNotification

logger = logging.getLogger("espais.push")


class ChannelNotifier:
    """Prova tots els canals. Si un falla, els altres s’envien igualment i es repropaga
    el primer error perquè el cas d’ús el registri com sempre."""

    def __init__(self, channels: list[Notifier]) -> None:
        self._channels = channels

    def send(self, notification: Notification) -> None:
        first_error: Exception | None = None
        for channel in self._channels:
            try:
                channel.send(notification)
            except Exception as exc:  # noqa: BLE001
                if first_error is None:
                    first_error = exc
        if first_error is not None:
            raise first_error


class PushNotifier:
    """Envia l’avís als navegadors subscrits. Mai llança: el push és un canal addicional."""

    def __init__(self, session_factory: sessionmaker, gateway: PushGateway) -> None:
        self._session_factory = session_factory
        self._gateway = gateway

    def send(self, notification: Notification) -> None:
        try:
            uow = SqlAlchemyPushUnitOfWork(self._session_factory)
            try:
                DeliverPushNotification(uow, self._gateway).execute(notification)
            finally:
                uow.close()
        except Exception as exc:  # noqa: BLE001
            logger.error("no s’ha pogut processar l’enviament push (%s)", type(exc).__name__)


class BackgroundNotifier:
    """Treu l’enviament de la petició: la resposta al responsable no espera el servei de push."""

    def __init__(self, inner: Notifier, executor: Executor | None = None) -> None:
        self._inner = inner
        self._executor = executor or ThreadPoolExecutor(max_workers=2, thread_name_prefix="push")

    def send(self, notification: Notification) -> None:
        try:
            self._executor.submit(self._run, notification)
        except Exception as exc:  # noqa: BLE001
            logger.error("no s’ha pogut programar l’enviament push (%s)", type(exc).__name__)

    def _run(self, notification: Notification) -> None:
        try:
            self._inner.send(notification)
        except Exception as exc:  # noqa: BLE001
            logger.error("l’enviament push ha fallat (%s)", type(exc).__name__)


def build_channel_notifier(
    email: Notifier,
    push: Notifier | None,
    executor: Executor | None = None,
) -> Notifier:
    if push is None:
        return email
    return ChannelNotifier([email, BackgroundNotifier(push, executor)])

