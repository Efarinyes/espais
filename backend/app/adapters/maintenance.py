"""Tasques periòdiques d’infra: no són casos d’ús HTTP."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable

from sqlalchemy.orm import sessionmaker

from app.adapters.sqlalchemy.reservations import SqlAlchemyReservationUnitOfWork
from app.adapters.system import SystemClock
from app.ports.identity import Clock
from app.usecases.purge_archived_notifications import PurgeArchivedNotifications

logger = logging.getLogger(__name__)

PURGE_INTERVAL_SECONDS = 24 * 60 * 60


def purge_archived_notifications_once(
    session_factory: sessionmaker,
    clock: Clock | None = None,
) -> int:
    uow = SqlAlchemyReservationUnitOfWork(session_factory)
    try:
        deleted = PurgeArchivedNotifications(uow, clock or SystemClock()).execute().deleted
        if deleted:
            logger.info("eliminats %s avisos arxivats de fa més de tres setmanes", deleted)
        return deleted
    except Exception:
        logger.exception("no s’han pogut eliminar els avisos arxivats antics")
        return 0
    finally:
        uow.close()


async def run_archived_notification_purge_loop(
    session_factory: sessionmaker,
    stop: asyncio.Event,
    *,
    interval_seconds: float = PURGE_INTERVAL_SECONDS,
    purge_once: Callable[[sessionmaker], int] | None = None,
) -> None:
    run = purge_once or purge_archived_notifications_once
    while not stop.is_set():
        await asyncio.to_thread(run, session_factory)
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval_seconds)
        except TimeoutError:
            continue
