from datetime import timedelta
from uuid import UUID

import pytest

from app.adapters.memory.identity import (
    FixedClock,
    InMemoryIdentityUnitOfWork,
    PlainPasswordHasher,
    SequentialIdGenerator,
)
from app.domain.errors import (
    DuplicateEmailError,
    ForbiddenError,
    InvitationAcceptedError,
    InvitationExpiredError,
    InvitationNotFoundError,
    InvalidRegistrationError,
)
from app.domain.identity import MembershipRole
from app.usecases.accept_invitation import AcceptInvitation, AcceptInvitationCommand
from app.usecases.get_invitation import GetInvitation
from app.usecases.invite_coordinator import InviteCoordinator, InviteCoordinatorCommand
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand


class FixedTokenGenerator:
    def __init__(self, token: str = "token-convidat") -> None:
        self.token = token

    def new(self) -> str:
        return self.token


def _seed_responsible(uow: InMemoryIdentityUnitOfWork) -> UUID:
    RegisterEntity(uow, FixedClock(), SequentialIdGenerator(), PlainPasswordHasher()).execute(
        RegisterEntityCommand(
            entity_name="AAVV Barri A",
            typology="associació de veïns",
            responsible_name="Anna",
            email="anna@example.com",
            password="secret123",
        )
    )
    return uow.memberships.list_all()[0].entity_id


def test_responsible_creates_pending_invitation() -> None:
    uow = InMemoryIdentityUnitOfWork()
    entity_id = _seed_responsible(uow)
    clock = FixedClock()
    result = InviteCoordinator(uow, clock, SequentialIdGenerator(), FixedTokenGenerator()).execute(
        InviteCoordinatorCommand(
            entity_id=entity_id,
            actor_role=MembershipRole.RESPONSIBLE,
            email="  coord@example.com  ",
        )
    )
    assert result.email == "coord@example.com"
    assert result.token == "token-convidat"
    assert result.expires_at == clock.now() + timedelta(days=14)
    invitation = uow.invitations.get_by_token("token-convidat")
    assert invitation is not None
    assert invitation.entity_id == entity_id
    assert invitation.accepted_at is None


def test_coordinator_cannot_invite() -> None:
    uow = InMemoryIdentityUnitOfWork()
    entity_id = _seed_responsible(uow)
    with pytest.raises(ForbiddenError):
        InviteCoordinator(uow, FixedClock(), SequentialIdGenerator(), FixedTokenGenerator()).execute(
            InviteCoordinatorCommand(
                entity_id=entity_id,
                actor_role=MembershipRole.COORDINATOR,
                email="coord@example.com",
            )
        )
    assert uow.invitations.get_by_token("token-convidat") is None


def test_cannot_invite_email_already_registered() -> None:
    uow = InMemoryIdentityUnitOfWork()
    entity_id = _seed_responsible(uow)
    with pytest.raises(DuplicateEmailError):
        InviteCoordinator(uow, FixedClock(), SequentialIdGenerator(), FixedTokenGenerator()).execute(
            InviteCoordinatorCommand(
                entity_id=entity_id,
                actor_role=MembershipRole.RESPONSIBLE,
                email="anna@example.com",
            )
        )


def test_accept_invitation_creates_coordinator_membership() -> None:
    uow = InMemoryIdentityUnitOfWork()
    entity_id = _seed_responsible(uow)
    InviteCoordinator(uow, FixedClock(), SequentialIdGenerator(), FixedTokenGenerator()).execute(
        InviteCoordinatorCommand(
            entity_id=entity_id,
            actor_role=MembershipRole.RESPONSIBLE,
            email="coord@example.com",
        )
    )
    ids = SequentialIdGenerator()
    ids._n = 10
    result = AcceptInvitation(uow, FixedClock(), ids, PlainPasswordHasher()).execute(
        AcceptInvitationCommand(
            token="token-convidat",
            name="  Carla  ",
            password="secret123",
        )
    )
    user = uow.users.get_by_email("coord@example.com")
    assert user is not None
    assert user.name == "Carla"
    membership = uow.memberships.get_by_user_id(user.id)
    assert membership is not None
    assert membership.role == MembershipRole.COORDINATOR
    assert membership.entity_id == entity_id
    assert membership.user_id == result.user_id
    invitation = uow.invitations.get_by_token("token-convidat")
    assert invitation is not None
    assert invitation.accepted_at is not None


def test_accept_unknown_token_fails() -> None:
    uow = InMemoryIdentityUnitOfWork()
    with pytest.raises(InvitationNotFoundError):
        AcceptInvitation(uow, FixedClock(), SequentialIdGenerator(), PlainPasswordHasher()).execute(
            AcceptInvitationCommand(token="inexistent", name="Carla", password="secret123")
        )


def test_accept_short_password_fails() -> None:
    uow = InMemoryIdentityUnitOfWork()
    entity_id = _seed_responsible(uow)
    InviteCoordinator(uow, FixedClock(), SequentialIdGenerator(), FixedTokenGenerator()).execute(
        InviteCoordinatorCommand(
            entity_id=entity_id,
            actor_role=MembershipRole.RESPONSIBLE,
            email="coord@example.com",
        )
    )
    with pytest.raises(InvalidRegistrationError):
        AcceptInvitation(uow, FixedClock(), SequentialIdGenerator(), PlainPasswordHasher()).execute(
            AcceptInvitationCommand(token="token-convidat", name="Carla", password="curt")
        )
    assert uow.users.get_by_email("coord@example.com") is None


def test_preview_returns_email_and_entity_name() -> None:
    uow = InMemoryIdentityUnitOfWork()
    entity_id = _seed_responsible(uow)
    InviteCoordinator(uow, FixedClock(), SequentialIdGenerator(), FixedTokenGenerator()).execute(
        InviteCoordinatorCommand(
            entity_id=entity_id,
            actor_role=MembershipRole.RESPONSIBLE,
            email="coord@example.com",
        )
    )
    preview = GetInvitation(uow, FixedClock()).execute("token-convidat")
    assert preview.email == "coord@example.com"
    assert preview.entity_name == "AAVV Barri A"


def test_accept_expired_invitation_fails() -> None:
    uow = InMemoryIdentityUnitOfWork()
    entity_id = _seed_responsible(uow)
    start = FixedClock()
    InviteCoordinator(uow, start, SequentialIdGenerator(), FixedTokenGenerator()).execute(
        InviteCoordinatorCommand(
            entity_id=entity_id,
            actor_role=MembershipRole.RESPONSIBLE,
            email="coord@example.com",
        )
    )
    later = FixedClock(start.now() + timedelta(days=15))
    with pytest.raises(InvitationExpiredError):
        AcceptInvitation(uow, later, SequentialIdGenerator(), PlainPasswordHasher()).execute(
            AcceptInvitationCommand(token="token-convidat", name="Carla", password="secret123")
        )
    assert uow.users.get_by_email("coord@example.com") is None


def test_accept_twice_fails() -> None:
    uow = InMemoryIdentityUnitOfWork()
    entity_id = _seed_responsible(uow)
    InviteCoordinator(uow, FixedClock(), SequentialIdGenerator(), FixedTokenGenerator()).execute(
        InviteCoordinatorCommand(
            entity_id=entity_id,
            actor_role=MembershipRole.RESPONSIBLE,
            email="coord@example.com",
        )
    )
    ids = SequentialIdGenerator()
    ids._n = 10
    AcceptInvitation(uow, FixedClock(), ids, PlainPasswordHasher()).execute(
        AcceptInvitationCommand(token="token-convidat", name="Carla", password="secret123")
    )
    with pytest.raises(InvitationAcceptedError):
        AcceptInvitation(uow, FixedClock(), SequentialIdGenerator(), PlainPasswordHasher()).execute(
            AcceptInvitationCommand(token="token-convidat", name="Dora", password="secret123")
        )
