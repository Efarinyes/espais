from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest

from app.adapters.memory.identity import FixedClock
from app.adapters.memory.revocation import InMemoryRevocationUnitOfWork
from app.adapters.sqlalchemy.revocation import SqlAlchemyRevocationUnitOfWork
from app.adapters.tokens import HmacTokenIssuer
from app.domain.errors import SessionNotFoundError
from app.usecases.close_session import CloseSession
from app.usecases.purge_expired_revocations import PurgeExpiredRevocations


def test_close_session_stores_the_hash_until_exp() -> None:
    clock = FixedClock(datetime(2026, 10, 21, 12, 0, tzinfo=UTC))
    issuer = HmacTokenIssuer("secret-de-prova", clock)
    token = issuer.issue(UUID(int=1))
    uow = InMemoryRevocationUnitOfWork()

    CloseSession(uow, issuer).execute(token)

    assert uow.contains(issuer.fingerprint(token))
    assert not uow.contains(token)
    assert issuer.parse(token) == UUID(int=1)


def test_close_session_rejects_an_unusable_token() -> None:
    clock = FixedClock()
    issuer = HmacTokenIssuer("secret-de-prova", clock)
    uow = InMemoryRevocationUnitOfWork()

    with pytest.raises(SessionNotFoundError):
        CloseSession(uow, issuer).execute("no-es-un-token")

    assert issuer.expires_at("no-es-un-token") is None


def test_purge_keeps_a_row_until_exp_has_passed() -> None:
    now = datetime(2026, 10, 21, 12, 0, tzinfo=UTC)
    uow = InMemoryRevocationUnitOfWork()
    uow.add("encara-valid", now)
    uow.add("ja-caducat", now - timedelta(seconds=1))

    deleted = PurgeExpiredRevocations(uow, FixedClock(now)).execute().deleted

    assert deleted == 1
    assert uow.contains("encara-valid")
    assert not uow.contains("ja-caducat")


def test_sqlite_purge_keeps_live_revocations(sqlite_session_factory) -> None:
    now = datetime(2026, 10, 21, 12, 0, tzinfo=UTC)
    escrit = SqlAlchemyRevocationUnitOfWork(sqlite_session_factory)
    escrit.revoked_tokens.add("viu", now + timedelta(days=1))
    escrit.revoked_tokens.add("caducat", now - timedelta(seconds=1))
    escrit.commit()
    escrit.close()

    lectura = SqlAlchemyRevocationUnitOfWork(sqlite_session_factory)
    deleted = PurgeExpiredRevocations(lectura, FixedClock(now)).execute().deleted

    assert deleted == 1
    assert lectura.revoked_tokens.contains("viu")
    assert not lectura.revoked_tokens.contains("caducat")
    lectura.close()
