"""Fàbrica de dependències HTTP. Sense regles de negoci."""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import sessionmaker

from app.adapters.security import BcryptPasswordHasher
from app.adapters.sqlalchemy.engine import make_engine, make_session_factory
from app.adapters.sqlalchemy.identity import SqlAlchemyIdentityUnitOfWork
from app.adapters.sqlalchemy.spaces import SqlAlchemySpaceUnitOfWork
from app.adapters.system import SystemClock, UuidIdGenerator
from app.adapters.tokens import HmacTokenIssuer
from app.domain.errors import SessionNotFoundError
from app.ports.identity import TokenIssuer
from app.usecases.authenticate_user import AuthenticateUser
from app.usecases.create_space import CreateSpace
from app.usecases.list_spaces import ListSpaces
from app.usecases.register_entity import RegisterEntity
from app.usecases.resolve_session import ResolveSession, SessionView

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class IdentityHttp:
    register: RegisterEntity
    authenticate: AuthenticateUser
    resolve: ResolveSession
    tokens: TokenIssuer


def get_session_factory(request: Request) -> sessionmaker:
    factory = getattr(request.app.state, "session_factory", None)
    if factory is None:
        factory = make_session_factory(make_engine())
        request.app.state.session_factory = factory
    return factory


def get_token_issuer(request: Request) -> TokenIssuer:
    issuer = getattr(request.app.state, "token_issuer", None)
    if issuer is None:
        issuer = HmacTokenIssuer("espais-dev-insegur", SystemClock())
        request.app.state.token_issuer = issuer
    return issuer


@dataclass
class SpacesHttp:
    create: CreateSpace
    list: ListSpaces


def get_identity_http(request: Request) -> Iterator[IdentityHttp]:
    uow = SqlAlchemyIdentityUnitOfWork(get_session_factory(request))
    hasher = BcryptPasswordHasher()
    try:
        yield IdentityHttp(
            register=RegisterEntity(uow, SystemClock(), UuidIdGenerator(), hasher),
            authenticate=AuthenticateUser(uow, hasher),
            resolve=ResolveSession(uow),
            tokens=get_token_issuer(request),
        )
    finally:
        uow.close()


def require_session(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> Iterator[SessionView]:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="cal iniciar sessió")
    user_id = get_token_issuer(request).parse(creds.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="sessió invàlida")

    uow = SqlAlchemyIdentityUnitOfWork(get_session_factory(request))
    try:
        try:
            view = ResolveSession(uow).execute(user_id)
        except SessionNotFoundError:
            raise HTTPException(status_code=401, detail="sessió invàlida") from None
        yield view
    finally:
        uow.close()


def get_spaces_http(request: Request) -> Iterator[SpacesHttp]:
    uow = SqlAlchemySpaceUnitOfWork(get_session_factory(request))
    try:
        yield SpacesHttp(
            create=CreateSpace(uow, SystemClock(), UuidIdGenerator()),
            list=ListSpaces(uow),
        )
    finally:
        uow.close()
