"""Adaptador in-memory per tests del cas d’ús (fakes)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from hmac import compare_digest
from uuid import UUID

from app.domain.identity import Entity, Membership, User
from app.domain.invitation import Invitation


@dataclass
class _Store:
    entities: list[Entity] = field(default_factory=list)
    users: list[User] = field(default_factory=list)
    memberships: list[Membership] = field(default_factory=list)
    invitations: list[Invitation] = field(default_factory=list)

    def copy(self) -> _Store:
        return _Store(
            entities=list(self.entities),
            users=list(self.users),
            memberships=list(self.memberships),
            invitations=list(self.invitations),
        )


class InMemoryEntityRepository:
    def __init__(self, uow: InMemoryIdentityUnitOfWork) -> None:
        self._uow = uow

    def add(self, entity: Entity) -> None:
        self._uow._working.entities.append(entity)

    def get_by_id(self, entity_id: UUID) -> Entity | None:
        for entity in self._uow._working.entities:
            if entity.id == entity_id:
                return entity
        return None

    def save(self, entity: Entity) -> None:
        working = self._uow._working.entities
        for index, existing in enumerate(working):
            if existing.id == entity.id:
                working[index] = entity
                return

    def list_all(self) -> list[Entity]:
        return list(self._uow._working.entities)


class InMemoryUserRepository:
    def __init__(self, uow: InMemoryIdentityUnitOfWork) -> None:
        self._uow = uow

    def add(self, user: User) -> None:
        self._uow._working.users.append(user)

    def get_by_id(self, user_id: UUID) -> User | None:
        for user in self._uow._working.users:
            if user.id == user_id:
                return user
        return None

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

    def get_by_user_id(self, user_id: UUID) -> Membership | None:
        for membership in self._uow._working.memberships:
            if membership.user_id == user_id:
                return membership
        return None

    def list_all(self) -> list[Membership]:
        return list(self._uow._working.memberships)


class InMemoryInvitationRepository:
    def __init__(self, uow: InMemoryIdentityUnitOfWork) -> None:
        self._uow = uow

    def add(self, invitation: Invitation) -> None:
        self._uow._working.invitations.append(invitation)

    def save(self, invitation: Invitation) -> None:
        working = self._uow._working.invitations
        for index, existing in enumerate(working):
            if existing.id == invitation.id:
                working[index] = invitation
                return
        working.append(invitation)

    def get_by_token(self, token: str) -> Invitation | None:
        needle = token.strip()
        for invitation in self._uow._working.invitations:
            if invitation.token == needle:
                return invitation
        return None


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
        self.invitations = InMemoryInvitationRepository(self)

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

    def verify(self, raw: str, hashed: str) -> bool:
        expected = f"hashed:{raw}"
        if len(expected) != len(hashed):
            return False
        return compare_digest(expected, hashed)
