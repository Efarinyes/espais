from datetime import UTC, datetime
from uuid import UUID

from app.adapters.memory.identity import (
    FixedClock,
    InMemoryIdentityUnitOfWork,
    PlainPasswordHasher,
    SequentialIdGenerator,
)
from app.domain.errors import ForbiddenError
from app.domain.identity import Entity, Membership, MembershipRole, User
from app.usecases.list_entity_coordinators import (
    ListEntityCoordinators,
    ListEntityCoordinatorsQuery,
)
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand


def _register(uow: InMemoryIdentityUnitOfWork, email: str = "anna@example.com"):
    return RegisterEntity(
        uow, FixedClock(), SequentialIdGenerator(), PlainPasswordHasher()
    ).execute(
        RegisterEntityCommand(
            entity_name="AAVV Barri A",
            typology="associació de veïns",
            responsible_name="Anna",
            email=email,
            password="secret123",
        )
    )


def _coordinator(uow: InMemoryIdentityUnitOfWork, entity_id: UUID, n: int, name: str) -> UUID:
    user_id = UUID(int=n)
    uow.users.add(
        User(
            id=user_id,
            name=name,
            email=f"c{n}@example.com",
            password_hash="hashed:secret123",
            created_at=datetime(2026, 9, 8, tzinfo=UTC),
        )
    )
    uow.memberships.add(
        Membership(
            id=UUID(int=1000 + n),
            user_id=user_id,
            entity_id=entity_id,
            role=MembershipRole.COORDINATOR,
        )
    )
    return user_id


def test_responsible_lists_coordinators_of_the_entity_by_name() -> None:
    uow = InMemoryIdentityUnitOfWork()
    registered = _register(uow)
    other = Entity(
        id=UUID(int=90),
        name="Altra",
        typology=None,
        created_at=datetime(2026, 9, 8, tzinfo=UTC),
    )
    uow.entities.add(other)
    _coordinator(uow, registered.entity_id, 20, "Núria")
    _coordinator(uow, registered.entity_id, 21, "Anna Soler")
    _coordinator(uow, registered.entity_id, 22, "Anna Costa")
    _coordinator(uow, other.id, 23, "Foraster")
    uow.commit()

    result = ListEntityCoordinators(uow).execute(
        ListEntityCoordinatorsQuery(
            entity_id=registered.entity_id,
            actor_role=MembershipRole.RESPONSIBLE,
        )
    )
    assert [item.name for item in result] == ["Anna Costa", "Anna Soler", "Núria"]
    assert "Foraster" not in [item.name for item in result]
    assert all(item.id != registered.user_id for item in result)


def test_coordinator_cannot_list_coordinators() -> None:
    uow = InMemoryIdentityUnitOfWork()
    registered = _register(uow)
    try:
        ListEntityCoordinators(uow).execute(
            ListEntityCoordinatorsQuery(
                entity_id=registered.entity_id,
                actor_role=MembershipRole.COORDINATOR,
            )
        )
    except ForbiddenError:
        return
    raise AssertionError("el coordinador no ha de veure la llista")
