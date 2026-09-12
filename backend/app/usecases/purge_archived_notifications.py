"""Elimina avisos arxivats fa més de tres setmanes. Tasca de manteniment, no d’un usuari."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.notification import ARCHIVED_NOTIFICATION_RETENTION
from app.ports.identity import Clock
from app.ports.reservations import ReservationUnitOfWork


@dataclass(frozen=True)
class PurgeArchivedNotificationsResult:
    deleted: int


class PurgeArchivedNotifications:
    def __init__(self, uow: ReservationUnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    def execute(self) -> PurgeArchivedNotificationsResult:
        cutoff = self._clock.now() - ARCHIVED_NOTIFICATION_RETENTION
        try:
            deleted = self._uow.notifications.delete_archived_before(cutoff)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
        return PurgeArchivedNotificationsResult(deleted=deleted)
