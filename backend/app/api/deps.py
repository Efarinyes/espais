"""Fàbrica de dependències HTTP. Sense regles de negoci."""

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import sessionmaker

from app.adapters.security import BcryptPasswordHasher
from app.adapters.sqlalchemy.engine import make_engine, make_session_factory
from app.adapters.sqlalchemy.identity import SqlAlchemyIdentityUnitOfWork
from app.adapters.system import SystemClock, UuidIdGenerator
from app.usecases.register_entity import RegisterEntity


def get_session_factory(request: Request) -> sessionmaker:
    factory = getattr(request.app.state, "session_factory", None)
    if factory is None:
        factory = make_session_factory(make_engine())
        request.app.state.session_factory = factory
    return factory


def get_register_entity(request: Request) -> Iterator[RegisterEntity]:
    uow = SqlAlchemyIdentityUnitOfWork(get_session_factory(request))
    try:
        yield RegisterEntity(uow, SystemClock(), UuidIdGenerator(), BcryptPasswordHasher())
    finally:
        uow.close()
