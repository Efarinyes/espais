"""Subscripcions Web Push a SQLAlchemy. Cada consulta porta entity_id i user_id."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, sessionmaker

from app.adapters.sqlalchemy.models import PushSubscriptionRow
from app.domain.push import PushSubscription, endpoint_hash


def _aware(moment: datetime) -> datetime:
    return moment.replace(tzinfo=UTC) if moment.tzinfo is None else moment


def _from_row(row: PushSubscriptionRow) -> PushSubscription:
    return PushSubscription(
        id=row.id,
        entity_id=row.entity_id,
        user_id=row.user_id,
        endpoint=row.endpoint,
        p256dh=row.p256dh,
        auth=row.auth,
        created_at=_aware(row.created_at),
    )


class SqlAlchemyPushSubscriptionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert(self, subscription: PushSubscription) -> None:
        digest = endpoint_hash(subscription.endpoint)
        row = self._session.scalar(
            select(PushSubscriptionRow).where(PushSubscriptionRow.endpoint_hash == digest)
        )
        if row is None:
            self._session.add(
                PushSubscriptionRow(
                    id=subscription.id,
                    entity_id=subscription.entity_id,
                    user_id=subscription.user_id,
                    endpoint_hash=digest,
                    endpoint=subscription.endpoint,
                    p256dh=subscription.p256dh,
                    auth=subscription.auth,
                    created_at=subscription.created_at,
                )
            )
        else:
            row.entity_id = subscription.entity_id
            row.user_id = subscription.user_id
            row.p256dh = subscription.p256dh
            row.auth = subscription.auth
            row.created_at = subscription.created_at
        self._session.flush()

    def list_for_user(self, entity_id: UUID, user_id: UUID) -> list[PushSubscription]:
        rows = self._session.scalars(
            select(PushSubscriptionRow)
            .where(
                PushSubscriptionRow.entity_id == entity_id,
                PushSubscriptionRow.user_id == user_id,
            )
            .order_by(PushSubscriptionRow.created_at, PushSubscriptionRow.id)
        ).all()
        return [_from_row(row) for row in rows]

    def delete_for_user(self, entity_id: UUID, user_id: UUID, endpoint: str) -> bool:
        result = self._session.execute(
            delete(PushSubscriptionRow).where(
                PushSubscriptionRow.entity_id == entity_id,
                PushSubscriptionRow.user_id == user_id,
                PushSubscriptionRow.endpoint_hash == endpoint_hash(endpoint),
            )
        )
        self._session.flush()
        return bool(result.rowcount)

    def delete_by_id(self, entity_id: UUID, subscription_id: UUID) -> bool:
        result = self._session.execute(
            delete(PushSubscriptionRow).where(
                PushSubscriptionRow.entity_id == entity_id,
                PushSubscriptionRow.id == subscription_id,
            )
        )
        self._session.flush()
        return bool(result.rowcount)

    def delete_oldest_beyond(self, entity_id: UUID, user_id: UUID, keep: int) -> int:
        rows = self._session.scalars(
            select(PushSubscriptionRow)
            .where(
                PushSubscriptionRow.entity_id == entity_id,
                PushSubscriptionRow.user_id == user_id,
            )
            .order_by(PushSubscriptionRow.created_at.desc(), PushSubscriptionRow.id)
        ).all()
        extra = rows[keep:]
        for row in extra:
            self._session.delete(row)
        self._session.flush()
        return len(extra)


class SqlAlchemyPushUnitOfWork:
    def __init__(self, session_factory: sessionmaker) -> None:
        self._session = session_factory()
        self.subscriptions = SqlAlchemyPushSubscriptionRepository(self._session)

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def close(self) -> None:
        self._session.close()
