from datetime import UTC, datetime
from uuid import UUID

from app.adapters.memory.identity import (
    FixedClock,
    InMemoryIdentityUnitOfWork,
    PlainPasswordHasher,
    SequentialIdGenerator,
)
from app.domain.errors import ForbiddenError, InvalidPaletteError
from app.domain.identity import Membership, MembershipRole, User
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand
from app.usecases.update_entity_palette import (
    UpdateEntityPalette,
    UpdateEntityPaletteCommand,
)


def _register(
    uow: InMemoryIdentityUnitOfWork,
    ids: SequentialIdGenerator | None = None,
    **overrides: object,
):
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    return RegisterEntity(
        uow, FixedClock(), ids or SequentialIdGenerator(), PlainPasswordHasher()
    ).execute(RegisterEntityCommand(**data))  # type: ignore[arg-type]


def test_responsible_saves_a_closed_palette() -> None:
    uow = InMemoryIdentityUnitOfWork()
    registered = _register(uow)
    result = UpdateEntityPalette(uow).execute(
        UpdateEntityPaletteCommand(
            entity_id=registered.entity_id,
            actor_role=MembershipRole.RESPONSIBLE,
            palette="camps",
        )
    )
    assert result.palette == "camps"
    assert uow.entities.get_by_id(registered.entity_id).palette == "camps"


def test_coordinator_cannot_change_palette() -> None:
    uow = InMemoryIdentityUnitOfWork()
    registered = _register(uow)
    uow.users.add(
        User(
            id=UUID(int=10),
            name="Carla",
            email="carla@example.com",
            password_hash="hashed:secret123",
            created_at=datetime(2026, 9, 8, 12, 0, tzinfo=UTC),
        )
    )
    uow.memberships.add(
        Membership(
            id=UUID(int=11),
            user_id=UUID(int=10),
            entity_id=registered.entity_id,
            role=MembershipRole.COORDINATOR,
        )
    )
    uow.commit()

    try:
        UpdateEntityPalette(uow).execute(
            UpdateEntityPaletteCommand(
                entity_id=registered.entity_id,
                actor_role=MembershipRole.COORDINATOR,
                palette="vinyes",
            )
        )
    except ForbiddenError:
        pass
    else:
        raise AssertionError("expected ForbiddenError")

    assert uow.entities.get_by_id(registered.entity_id).palette == "mar-cel"


def test_unknown_palette_is_rejected() -> None:
    uow = InMemoryIdentityUnitOfWork()
    registered = _register(uow)
    try:
        UpdateEntityPalette(uow).execute(
            UpdateEntityPaletteCommand(
                entity_id=registered.entity_id,
                actor_role=MembershipRole.RESPONSIBLE,
                palette="neon",
            )
        )
    except InvalidPaletteError:
        pass
    else:
        raise AssertionError("expected InvalidPaletteError")

    assert uow.entities.get_by_id(registered.entity_id).palette == "mar-cel"


def test_tenant_a_does_not_paint_tenant_b() -> None:
    uow = InMemoryIdentityUnitOfWork()
    ids = SequentialIdGenerator()
    first = _register(uow, ids, email="a@example.com", entity_name="Entitat A")
    second = _register(
        uow,
        ids,
        email="b@example.com",
        entity_name="Entitat B",
        responsible_name="Berta",
    )
    UpdateEntityPalette(uow).execute(
        UpdateEntityPaletteCommand(
            entity_id=first.entity_id,
            actor_role=MembershipRole.RESPONSIBLE,
            palette="citrics",
        )
    )
    assert uow.entities.get_by_id(first.entity_id).palette == "citrics"
    assert uow.entities.get_by_id(second.entity_id).palette == "mar-cel"
