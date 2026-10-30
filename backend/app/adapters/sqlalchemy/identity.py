"""Unit of work i repositoris SQLAlchemy per identitat."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.adapters.sqlalchemy.models import (
    EntityRow,
    InvitationRow,
    MembershipRow,
    PasswordResetRow,
    RecoveryAttemptRow,
    UserRow,
)
from app.domain.errors import DuplicateEmailError
from app.domain.identity import Entity, Membership, MembershipRole, User
from app.domain.invitation import Invitation
from app.domain.password_reset import PasswordReset, RecoveryAttempt


def _aware(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment


def _entity_from_row(row: EntityRow) -> Entity:
    return Entity(
        id=row.id,
        name=row.name,
        typology=row.typology,
        created_at=_aware(row.created_at),
        palette=row.palette,
    )


def _user_from_row(row: UserRow) -> User:
    return User(
        id=row.id,
        name=row.name,
        email=row.email,
        password_hash=row.password_hash,
        created_at=_aware(row.created_at),
        session_version=row.session_version,
    )


def _membership_from_row(row: MembershipRow) -> Membership:
    return Membership(
        id=row.id,
        user_id=row.user_id,
        entity_id=row.entity_id,
        role=MembershipRole(row.role),
    )


def _invitation_from_row(row: InvitationRow) -> Invitation:
    return Invitation(
        id=row.id,
        entity_id=row.entity_id,
        email=row.email,
        token=row.token,
        expires_at=_aware(row.expires_at),
        accepted_at=_aware(row.accepted_at) if row.accepted_at is not None else None,
        created_at=_aware(row.created_at),
    )


class SqlAlchemyEntityRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, entity: Entity) -> None:
        self._session.add(
            EntityRow(
                id=entity.id,
                name=entity.name,
                typology=entity.typology,
                palette=entity.palette,
                created_at=entity.created_at,
            )
        )
        self._session.flush()

    def get_by_id(self, entity_id: UUID) -> Entity | None:
        row = self._session.get(EntityRow, entity_id)
        if row is None:
            return None
        return _entity_from_row(row)

    def save(self, entity: Entity) -> None:
        row = self._session.get(EntityRow, entity.id)
        if row is None:
            return
        row.name = entity.name
        row.typology = entity.typology
        row.palette = entity.palette
        self._session.flush()

    def list_all(self) -> list[Entity]:
        rows = self._session.scalars(select(EntityRow)).all()
        return [_entity_from_row(row) for row in rows]


class SqlAlchemyUserRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, user: User) -> None:
        self._session.add(
            UserRow(
                id=user.id,
                name=user.name,
                email=user.email,
                password_hash=user.password_hash,
                session_version=user.session_version,
                created_at=user.created_at,
            )
        )
        try:
            self._session.flush()
        except IntegrityError as exc:
            raise DuplicateEmailError(user.email) from exc

    def get_by_id(self, user_id: UUID) -> User | None:
        row = self._session.get(UserRow, user_id)
        if row is None:
            return None
        return _user_from_row(row)

    def get_by_email(self, email: str) -> User | None:
        needle = email.strip().lower()
        row = self._session.scalar(select(UserRow).where(UserRow.email == needle))
        if row is None:
            return None
        return _user_from_row(row)

    def save(self, user: User) -> None:
        row = self._session.get(UserRow, user.id)
        if row is None:
            self.add(user)
            return
        row.name = user.name
        row.email = user.email
        row.password_hash = user.password_hash
        row.session_version = user.session_version
        self._session.flush()


class SqlAlchemyMembershipRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, membership: Membership) -> None:
        self._session.add(
            MembershipRow(
                id=membership.id,
                user_id=membership.user_id,
                entity_id=membership.entity_id,
                role=membership.role.value,
            )
        )
        self._session.flush()

    def get_by_user_id(self, user_id: UUID) -> Membership | None:
        row = self._session.scalar(select(MembershipRow).where(MembershipRow.user_id == user_id))
        if row is None:
            return None
        return _membership_from_row(row)

    def list_all(self) -> list[Membership]:
        rows = self._session.scalars(select(MembershipRow)).all()
        return [_membership_from_row(row) for row in rows]


class SqlAlchemyInvitationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, invitation: Invitation) -> None:
        self._session.add(
            InvitationRow(
                id=invitation.id,
                entity_id=invitation.entity_id,
                email=invitation.email,
                token=invitation.token,
                expires_at=invitation.expires_at,
                accepted_at=invitation.accepted_at,
                created_at=invitation.created_at,
            )
        )
        self._session.flush()

    def save(self, invitation: Invitation) -> None:
        row = self._session.get(InvitationRow, invitation.id)
        if row is None:
            self.add(invitation)
            return
        row.email = invitation.email
        row.token = invitation.token
        row.expires_at = invitation.expires_at
        row.accepted_at = invitation.accepted_at
        self._session.flush()

    def get_by_token(self, token: str) -> Invitation | None:
        row = self._session.scalar(select(InvitationRow).where(InvitationRow.token == token.strip()))
        if row is None:
            return None
        return _invitation_from_row(row)


def _reset_from_row(row: PasswordResetRow) -> PasswordReset:
    return PasswordReset(
        id=row.id,
        user_id=row.user_id,
        token_hash=row.token_hash,
        expires_at=_aware(row.expires_at),
        used_at=_aware(row.used_at) if row.used_at is not None else None,
        created_at=_aware(row.created_at),
    )


class SqlAlchemyPasswordResetRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, reset: PasswordReset) -> None:
        self._session.add(
            PasswordResetRow(
                id=reset.id,
                user_id=reset.user_id,
                token_hash=reset.token_hash,
                expires_at=reset.expires_at,
                used_at=reset.used_at,
                created_at=reset.created_at,
            )
        )
        self._session.flush()

    def save(self, reset: PasswordReset) -> None:
        row = self._session.get(PasswordResetRow, reset.id)
        if row is None:
            self.add(reset)
            return
        row.used_at = reset.used_at
        row.expires_at = reset.expires_at
        self._session.flush()

    def get_by_token_hash(self, token_hash: str) -> PasswordReset | None:
        row = self._session.scalar(
            select(PasswordResetRow).where(PasswordResetRow.token_hash == token_hash)
        )
        if row is None:
            return None
        return _reset_from_row(row)

    def consume(self, token_hash: str, now: datetime) -> PasswordReset | None:
        result = self._session.execute(
            update(PasswordResetRow)
            .where(
                PasswordResetRow.token_hash == token_hash,
                PasswordResetRow.used_at.is_(None),
                PasswordResetRow.expires_at > now,
            )
            .values(used_at=now)
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            return None
        row = self._session.scalar(
            select(PasswordResetRow)
            .where(PasswordResetRow.token_hash == token_hash)
            .execution_options(populate_existing=True)
        )
        return _reset_from_row(row) if row is not None else None

    def invalidate_unused(self, user_id: UUID, now: datetime) -> None:
        rows = self._session.scalars(
            select(PasswordResetRow).where(
                PasswordResetRow.user_id == user_id,
                PasswordResetRow.used_at.is_(None),
            )
        ).all()
        for row in rows:
            row.used_at = now
        self._session.flush()


class SqlAlchemyRecoveryAttemptRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, attempt: RecoveryAttempt) -> None:
        self._session.add(
            RecoveryAttemptRow(
                id=attempt.id,
                subject_hash=attempt.subject_hash,
                ip_hash=attempt.ip_hash,
                created_at=attempt.created_at,
            )
        )
        self._session.flush()

    def count_subject_since(self, subject_hash: str, since: datetime) -> int:
        total = self._session.scalar(
            select(func.count())
            .select_from(RecoveryAttemptRow)
            .where(
                RecoveryAttemptRow.subject_hash == subject_hash,
                RecoveryAttemptRow.created_at >= since,
            )
        )
        return int(total or 0)

    def count_ip_since(self, ip_hash: str, since: datetime) -> int:
        total = self._session.scalar(
            select(func.count())
            .select_from(RecoveryAttemptRow)
            .where(
                RecoveryAttemptRow.ip_hash == ip_hash,
                RecoveryAttemptRow.created_at >= since,
            )
        )
        return int(total or 0)

    def purge_before(self, moment: datetime) -> int:
        result = self._session.execute(
            delete(RecoveryAttemptRow).where(RecoveryAttemptRow.created_at < moment)
        )
        self._session.flush()
        return int(result.rowcount or 0)


class FailingSqlAlchemyMembershipRepository(SqlAlchemyMembershipRepository):
    def add(self, membership: Membership) -> None:
        raise RuntimeError("fallada en desar membership")


class SqlAlchemyIdentityUnitOfWork:
    def __init__(self, session_factory: sessionmaker) -> None:
        self._session = session_factory()
        self.entities = SqlAlchemyEntityRepository(self._session)
        self.users = SqlAlchemyUserRepository(self._session)
        self.memberships = SqlAlchemyMembershipRepository(self._session)
        self.invitations = SqlAlchemyInvitationRepository(self._session)
        self.password_resets = SqlAlchemyPasswordResetRepository(self._session)
        self.recovery_attempts = SqlAlchemyRecoveryAttemptRepository(self._session)

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def close(self) -> None:
        self._session.close()
