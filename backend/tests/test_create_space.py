from uuid import UUID

from app.adapters.memory.identity import FixedClock, SequentialIdGenerator
from app.adapters.memory.spaces import InMemorySpaceUnitOfWork
from app.domain.errors import DuplicateSpaceNameError, ForbiddenError, InvalidSpaceError
from app.domain.identity import MembershipRole
from app.usecases.create_space import CreateSpace, CreateSpaceCommand
from app.usecases.list_spaces import ListSpaces

ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)


def _create(uow: InMemorySpaceUnitOfWork, ids: SequentialIdGenerator | None = None) -> CreateSpace:
    return CreateSpace(uow, FixedClock(), ids or SequentialIdGenerator())


def test_create_space_stores_name_capacity_and_entity() -> None:
    uow = InMemorySpaceUnitOfWork()
    result = _create(uow).execute(
        CreateSpaceCommand(
            entity_id=ENTITY_A,
            actor_role=MembershipRole.RESPONSIBLE,
            name="  Sala 1  ",
            capacity=40,
            equipment="projector",
        )
    )
    spaces = ListSpaces(uow).execute(ENTITY_A)
    assert len(spaces) == 1
    space = spaces[0]
    assert space.id == result.space.id
    assert space.entity_id == ENTITY_A
    assert space.name == "Sala 1"
    assert space.capacity == 40
    assert space.equipment == "projector"
    assert space.active is True
    assert len(space.windows) == 7


def test_duplicate_name_same_entity_is_rejected() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    use_case = _create(uow, ids)
    use_case.execute(
        CreateSpaceCommand(
            entity_id=ENTITY_A,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=20,
        )
    )
    try:
        use_case.execute(
            CreateSpaceCommand(
                entity_id=ENTITY_A,
                actor_role=MembershipRole.RESPONSIBLE,
                name="sala 1",
                capacity=30,
            )
        )
    except DuplicateSpaceNameError:
        pass
    else:
        raise AssertionError("expected DuplicateSpaceNameError")
    assert len(ListSpaces(uow).execute(ENTITY_A)) == 1


def test_same_name_allowed_in_two_entities() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    use_case = _create(uow, ids)
    use_case.execute(
        CreateSpaceCommand(
            entity_id=ENTITY_A,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=20,
        )
    )
    use_case.execute(
        CreateSpaceCommand(
            entity_id=ENTITY_B,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=80,
        )
    )
    assert len(ListSpaces(uow).execute(ENTITY_A)) == 1
    assert len(ListSpaces(uow).execute(ENTITY_B)) == 1
    assert ListSpaces(uow).execute(ENTITY_A)[0].capacity == 20
    assert ListSpaces(uow).execute(ENTITY_B)[0].capacity == 80


def test_list_spaces_does_not_leak_other_entity() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    use_case = _create(uow, ids)
    use_case.execute(
        CreateSpaceCommand(
            entity_id=ENTITY_A,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala Pau Casals",
            capacity=10,
        )
    )
    use_case.execute(
        CreateSpaceCommand(
            entity_id=ENTITY_B,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Pista 1",
            capacity=12,
        )
    )
    names_a = [space.name for space in ListSpaces(uow).execute(ENTITY_A)]
    assert names_a == ["Sala Pau Casals"]


def test_capacity_must_be_positive() -> None:
    uow = InMemorySpaceUnitOfWork()
    try:
        _create(uow).execute(
            CreateSpaceCommand(
                entity_id=ENTITY_A,
                actor_role=MembershipRole.RESPONSIBLE,
                name="Sala 1",
                capacity=0,
            )
        )
    except InvalidSpaceError:
        pass
    else:
        raise AssertionError("expected InvalidSpaceError")
    assert ListSpaces(uow).execute(ENTITY_A) == []


def test_coordinator_cannot_create_space() -> None:
    uow = InMemorySpaceUnitOfWork()
    try:
        _create(uow).execute(
            CreateSpaceCommand(
                entity_id=ENTITY_A,
                actor_role=MembershipRole.COORDINATOR,
                name="Sala 1",
                capacity=10,
            )
        )
    except ForbiddenError:
        pass
    else:
        raise AssertionError("expected ForbiddenError")
    assert ListSpaces(uow).execute(ENTITY_A) == []
