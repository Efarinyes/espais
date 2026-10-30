"""Consum del token a SQLite: dues confirmacions alhora no el poden fer servir dues vegades."""

from collections.abc import Callable, Iterator
from datetime import timedelta
from pathlib import Path
from uuid import UUID

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.adapters.memory.identity import FixedClock, PlainPasswordHasher
from app.adapters.sqlalchemy import models as identity_models  # noqa: F401
from app.adapters.sqlalchemy.base import Base
from app.adapters.sqlalchemy.identity import SqlAlchemyIdentityUnitOfWork
from app.domain.errors import InvalidPasswordResetError
from app.domain.identity import User
from app.domain.password_reset import PasswordReset
from app.usecases.confirm_password_reset import (
    ConfirmPasswordReset,
    ConfirmPasswordResetCommand,
)
from app.usecases.request_password_reset import blind_hash

USER_ID = UUID(int=1)


@pytest.fixture
def file_factory(tmp_path: Path) -> Iterator[sessionmaker]:
    engine = create_engine(f"sqlite:///{tmp_path / 'espais.sqlite3'}", connect_args={"check_same_thread": False})

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
        uow.users.add(
            User(
                id=USER_ID,
                name="Anna",
                email="anna@example.com",
                password_hash=PlainPasswordHasher().hash("secret123"),
                created_at=clock.now(),
            )
        )
        uow.password_resets.add(
            PasswordReset(
                id=UUID(int=2),
                user_id=USER_ID,
                token_hash=blind_hash(token),
                expires_at=clock.now() + timedelta(hours=1),
                used_at=None,
                created_at=clock.now(),
            )
        )
        uow.commit()
    finally:
        uow.close()


def _user(factory: sessionmaker) -> User:
    uow = SqlAlchemyIdentityUnitOfWork(factory)
    try:
        user = uow.users.get_by_id(USER_ID)
        assert user is not None
        return user
    finally:
        uow.close()


class RacingHasher(PlainPasswordHasher):
    """Executa la confirmació rival just després de la comprovació prèvia i abans del consum."""

    def __init__(self, rival: Callable[[], None]) -> None:
        self._rival: Callable[[], None] | None = rival

    def hash(self, raw: str) -> str:
        if self._rival is not None:
            rival, self._rival = self._rival, None
            rival()
        return super().hash(raw)


def test_dues_confirmacions_alhora_nomes_en_guanya_una(file_factory: sessionmaker) -> None:
    clock = FixedClock()
    _seed(file_factory, clock, "token-a")
    uow_a = SqlAlchemyIdentityUnitOfWork(file_factory)
    uow_b = SqlAlchemyIdentityUnitOfWork(file_factory)
    try:
        def rival() -> None:
            ConfirmPasswordReset(uow_a, clock, PlainPasswordHasher()).execute(
                ConfirmPasswordResetCommand(token="token-a", password="guanyadora")
            )

        with pytest.raises(InvalidPasswordResetError):
            ConfirmPasswordReset(uow_b, clock, RacingHasher(rival)).execute(
                ConfirmPasswordResetCommand(token="token-a", password="perdedora")
            )
    finally:
        uow_a.close()
        uow_b.close()
    user = _user(file_factory)
    assert user.password_hash == PlainPasswordHasher().hash("guanyadora")
    assert user.session_version == 1


def test_el_consum_a_sqlite_respecta_la_caducitat_i_l_us(file_factory: sessionmaker) -> None:
    clock = FixedClock()
    _seed(file_factory, clock, "token-a")
    uow = SqlAlchemyIdentityUnitOfWork(file_factory)
    try:
        assert uow.password_resets.consume(blind_hash("token-a"), clock.now() + timedelta(hours=1)) is None
        consumed = uow.password_resets.consume(blind_hash("token-a"), clock.now())
        assert consumed is not None
        assert consumed.used_at is not None
        assert uow.password_resets.consume(blind_hash("token-a"), clock.now()) is None
        assert uow.password_resets.consume(blind_hash("inventat"), clock.now()) is None
    finally:
        uow.close()


def test_si_el_canvi_falla_el_token_no_queda_consumit(file_factory: sessionmaker) -> None:
    clock = FixedClock()
    _seed(file_factory, clock, "token-a")

    class FailingSave(SqlAlchemyIdentityUnitOfWork):
        def __init__(self, factory: sessionmaker) -> None:
            super().__init__(factory)
            original = self.users

            class Users:
                def get_by_id(self, user_id: UUID) -> User | None:
                    return original.get_by_id(user_id)

                def save(self, user: User) -> None:
                    raise RuntimeError("disc ple")

            self.users = Users()  # type: ignore[assignment]

    uow = FailingSave(file_factory)
    try:
        with pytest.raises(RuntimeError):
            ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
                ConfirmPasswordResetCommand(token="token-a", password="nova-clau")
            )
    finally:
        uow.close()
    uow = SqlAlchemyIdentityUnitOfWork(file_factory)
    try:
        ConfirmPasswordReset(uow, clock, PlainPasswordHasher()).execute(
            ConfirmPasswordResetCommand(token="token-a", password="nova-clau")
        )
    finally:
        uow.close()
    assert _user(file_factory).session_version == 1
