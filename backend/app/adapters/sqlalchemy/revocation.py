"""Taula de revocació a la mateixa SQLite que la resta de l’Alpha."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import delete
from sqlalchemy.orm import Session, sessionmaker

from app.adapters.sqlalchemy.models import RevokedTokenRow


class SqlAlchemyRevokedTokenRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, token_hash: str, expires_at: datetime) -> None:
        if self._session.get(RevokedTokenRow, token_hash) is not None:
            return
        self._session.add(RevokedTokenRow(token_hash=token_hash, expires_at=expires_at))
        self._session.flush()

    def contains(self, token_hash: str) -> bool:
        return self._session.get(RevokedTokenRow, token_hash) is not None

    def purge_expired(self, now: datetime) -> int:
        result = self._session.execute(
            delete(RevokedTokenRow).where(RevokedTokenRow.expires_at < now)
        )
        self._session.flush()
        return int(result.rowcount or 0)


class SqlAlchemyRevocationUnitOfWork:
    def __init__(self, session_factory: sessionmaker) -> None:
        self._session = session_factory()
        self.revoked_tokens = SqlAlchemyRevokedTokenRepository(self._session)

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def close(self) -> None:
        self._session.close()
