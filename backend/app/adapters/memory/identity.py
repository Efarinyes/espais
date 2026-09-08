"""Adaptador in-memory per tests del cas d’ús (fakes)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID

from app.domain.identity import Entity, Membership, User


@dataclass
class _Store:
    entities: list[Entity] = field(default_factory=list)
    users: list[User] = field(default_factory=list)
    memberships: list[Membership] = field(default_factory=list)

    def copy(self) -> _Store:
        return _Store(
            entities=list(self.entities),
            users=list(self.users),
            memberships=list(self.memberships),
        )


class InMemoryEntityRepository:
    def __init__(self, uow: InMemoryIdentityUnitOfWork) -> None:
        self._uow = uow

    def add(self, entity: Entity) -> None:
        self._uow._working.entities.append(entity)

    def list_all(self) -> list[Entity]:
        return list(self._uow._working.entities)


class InMemoryUserRepository:
    def __init__(self, uow: InMemoryIdentityUnitOfWork) -> None:
        self._uow = uow

    def add(self, user: User) -> None:
        self._uow._working.users.append(user)

    def get_by_email(self, email: str) -> User | None:
        needle = email.strip().lower()
        for user in self._uow._working.users:
            if user.email == needle:
                return user
        return None


class InMemoryMembershipRepository:
    def __init__(self, uow: InMemoryIdentityUnitOfWork) -> None:
        self._uow = uow

    def add(self, membership: Membership) -> None:
        self._uow._working.memberships.append(membership)

    def list_all(self) -> list[Membership]:
        return list(self._uow._working.memberships)


class FailingMembershipRepository(InMemoryMembershipRepository):
    def add(self, membership: Membership) -> None:
        raise RuntimeError("fallada en desar membership")


class InMemoryIdentityUnitOfWork:
    def __init__(self) -> None:
        self._committed = _Store()
        self._working = self._committed.copy()
        self.entities = InMemoryEntityRepository(self)
        self.users = InMemoryUserRepository(self)
        self.memberships = InMemoryMembershipRepository(self)

    def commit(self) -> None:
        self._committed = self._working.copy()

    def rollback(self) -> None:
        self._working = self._committed.copy()


class FixedClock:
    def __init__(self, moment: datetime | None = None) -> None:
        self._moment = moment or datetime(2026, 9, 8, 12, 0, tzinfo=UTC)

    def now(self) -> datetime:
        return self._moment


class SequentialIdGenerator:
    def __init__(self) -> None:
        self._n = 0

    def new(self) -> UUID:
        self._n += 1
        return UUID(int=self._n)


class PlainPasswordHasher:
    def hash(self, raw: str) -> str:
        return f"hashed:{raw}"
