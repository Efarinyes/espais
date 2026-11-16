"""Dues confirmacions alhora no poden activar el compte dues vegades."""

from collections.abc import Iterator
from datetime import timedelta
from pathlib import Path
from uuid import UUID

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.adapters.memory.identity import FixedClock
from app.adapters.sqlalchemy import models as identity_models  # noqa: F401
from app.adapters.sqlalchemy.base import Base
from app.adapters.sqlalchemy.identity import SqlAlchemyIdentityUnitOfWork
from app.domain.email_verification import EmailVerification
from app.domain.errors import InvalidEmailVerificationError
from app.domain.identity import Entity, Membership, MembershipRole, User
from app.usecases.confirm_email_verification import (
    ConfirmEmailVerification,
    ConfirmEmailVerificationCommand,
)
from app.usecases.request_password_reset import blind_hash

USER_ID = UUID(int=1)
ENTITY_ID = UUID(int=2)
MEMBERSHIP_ID = UUID(int=3)


@pytest.fixture
def file_factory(tmp_path: Path) -> Iterator[sessionmaker]:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'espais.sqlite3'}",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _fk(dbapi_connection, _record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False, future=True)
    try:
        yield factory
    finally:
        engine.dispose()


def _seed(factory: sessionmaker, clock: FixedClock, token: str) -> None:
    uow = SqlAlchemyIdentityUnitOfWork(factory)
    try:
        uow.entities.add(
            Entity(
                id=ENTITY_ID,
                name="AAVV Barri A",
                typology=None,
                created_at=clock.now(),
                activated_at=None,
            )
        )
        uow.users.add(
            User(
                id=USER_ID,
                name="Anna",
                email="anna@example.com",
                password_hash="hash",
                created_at=clock.now(),
                email_verified_at=None,
            )
        )
        uow.memberships.add(
            Membership(
                id=MEMBERSHIP_ID,
                user_id=USER_ID,
                entity_id=ENTITY_ID,
                role=MembershipRole.RESPONSIBLE,
            )
        )
        uow.email_verifications.add(
            EmailVerification(
                id=UUID(int=4),
                user_id=USER_ID,
                token_hash=blind_hash(token),
                expires_at=clock.now() + timedelta(hours=24),
                used_at=None,
                created_at=clock.now(),
            )
        )
        uow.commit()
    finally:
        uow.close()


def test_dues_confirmacions_alhora_nomes_en_guanya_una(file_factory: sessionmaker) -> None:
    clock = FixedClock()
    _seed(file_factory, clock, "token-a")
    uow_a = SqlAlchemyIdentityUnitOfWork(file_factory)
    uow_b = SqlAlchemyIdentityUnitOfWork(file_factory)
    try:
        original = uow_b.email_verifications.get_by_token_hash

        def rival() -> None:
            ConfirmEmailVerification(uow_a, clock).execute(ConfirmEmailVerificationCommand(token="token-a"))

        def wrapped(token_hash: str):
            trobat = original(token_hash)
            rival()
            return trobat

        uow_b.email_verifications.get_by_token_hash = wrapped  # type: ignore[method-assign]
        with pytest.raises(InvalidEmailVerificationError):
            ConfirmEmailVerification(uow_b, clock).execute(ConfirmEmailVerificationCommand(token="token-a"))
    finally:
        uow_a.close()
        uow_b.close()

    lector = SqlAlchemyIdentityUnitOfWork(file_factory)
    try:
        user = lector.users.get_by_id(USER_ID)
        entity = lector.entities.get_by_id(ENTITY_ID)
        assert user is not None and user.email_verified_at == clock.now()
        assert entity is not None and entity.activated_at == clock.now()
        with pytest.raises(InvalidEmailVerificationError):
            ConfirmEmailVerification(lector, clock).execute(ConfirmEmailVerificationCommand(token="token-a"))
    finally:
        lector.close()
