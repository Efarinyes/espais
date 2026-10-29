"""Adaptador in-memory per tests del cas d’ús (fakes)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from hmac import compare_digest
from uuid import UUID

from app.domain.identity import Entity, Membership, User
from app.domain.invitation import Invitation
from app.domain.password_reset import PasswordReset, RecoveryAttempt


@dataclass
class _Store:
    entities: list[Entity] = field(default_factory=list)
    users: list[User] = field(default_factory=list)
    memberships: list[Membership] = field(default_factory=list)
    invitations: list[Invitation] = field(default_factory=list)
    password_resets: list[PasswordReset] = field(default_factory=list)
    recovery_attempts: list[RecoveryAttempt] = field(default_factory=list)

    def copy(self) -> _Store:
        return _Store(
            entities=list(self.entities),
            users=list(self.users),
            memberships=list(self.memberships),
            invitations=list(self.invitations),
            password_resets=list(self.password_resets),
            recovery_attempts=list(self.recovery_attempts),
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

    def save(self, user: User) -> None:
        working = self._uow._working.users
        for index, existing in enumerate(working):
            if existing.id == user.id:
                working[index] = user
                return
        working.append(user)


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


class InMemoryPasswordResetRepository:
    def __init__(self, uow: InMemoryIdentityUnitOfWork) -> None:
        self._uow = uow

    def add(self, reset: PasswordReset) -> None:
        self._uow._working.password_resets.append(reset)

    def save(self, reset: PasswordReset) -> None:
        working = self._uow._working.password_resets
        for index, existing in enumerate(working):
            if existing.id == reset.id:
                working[index] = reset
                return
        working.append(reset)

    def get_by_token_hash(self, token_hash: str) -> PasswordReset | None:
        for reset in self._uow._working.password_resets:
            if reset.token_hash == token_hash:
                return reset
        return None

    def invalidate_unused(self, user_id: UUID, now: datetime) -> None:
        working = self._uow._working.password_resets
        for index, reset in enumerate(working):
            if reset.user_id == user_id and reset.used_at is None:
                working[index] = PasswordReset(
                    id=reset.id,
                    user_id=reset.user_id,
                    token_hash=reset.token_hash,
                    expires_at=reset.expires_at,
                    used_at=now,
                    created_at=reset.created_at,
                )


class InMemoryRecoveryAttemptRepository:
    def __init__(self, uow: InMemoryIdentityUnitOfWork) -> None:
        self._uow = uow

    def add(self, attempt: RecoveryAttempt) -> None:
        self._uow._working.recovery_attempts.append(attempt)

    def count_subject_since(self, subject_hash: str, since: datetime) -> int:
        return sum(
            1
            for attempt in self._uow._working.recovery_attempts
            if attempt.subject_hash == subject_hash and attempt.created_at >= since
        )

    def count_ip_since(self, ip_hash: str, since: datetime) -> int:
        return sum(
            1
            for attempt in self._uow._working.recovery_attempts
            if attempt.ip_hash == ip_hash and attempt.created_at >= since
        )

    def purge_before(self, moment: datetime) -> int:
        working = self._uow._working.recovery_attempts
        kept = [attempt for attempt in working if attempt.created_at >= moment]
        deleted = len(working) - len(kept)
        self._uow._working.recovery_attempts = kept
        return deleted


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
        self.password_resets = InMemoryPasswordResetRepository(self)
        self.recovery_attempts = InMemoryRecoveryAttemptRepository(self)

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
