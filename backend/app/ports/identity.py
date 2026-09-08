"""Ports d’identitat: persistència, rellotge, IDs, hash."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.domain.identity import Entity, Membership, User


class Clock(Protocol):
    def now(self) -> datetime: ...


class IdGenerator(Protocol):
    def new(self) -> UUID: ...


class PasswordHasher(Protocol):
    def hash(self, raw: str) -> str: ...

    def verify(self, raw: str, hashed: str) -> bool: ...


class TokenIssuer(Protocol):
    def issue(self, user_id: UUID) -> str: ...

    def parse(self, token: str) -> UUID | None: ...


class EntityRepository(Protocol):
    def add(self, entity: Entity) -> None: ...

    def get_by_id(self, entity_id: UUID) -> Entity | None: ...

    def list_all(self) -> list[Entity]: ...


class UserRepository(Protocol):
    def add(self, user: User) -> None: ...

    def get_by_id(self, user_id: UUID) -> User | None: ...

    def get_by_email(self, email: str) -> User | None: ...


class MembershipRepository(Protocol):
    def add(self, membership: Membership) -> None: ...

    def get_by_user_id(self, user_id: UUID) -> Membership | None: ...

    def list_all(self) -> list[Membership]: ...


class IdentityUnitOfWork(Protocol):
    entities: EntityRepository
    users: UserRepository
    memberships: MembershipRepository

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
