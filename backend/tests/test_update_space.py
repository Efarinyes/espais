from uuid import UUID

from app.adapters.memory.identity import FixedClock, SequentialIdGenerator
from app.adapters.memory.spaces import InMemorySpaceUnitOfWork
from app.domain.errors import DuplicateSpaceNameError, ForbiddenError, InvalidSpaceError, SpaceNotFoundError
from app.domain.identity import MembershipRole
from app.usecases.create_space import CreateSpace, CreateSpaceCommand
from app.usecases.get_space import GetSpace
from app.usecases.list_spaces import ListSpaces
from app.usecases.update_space import UpdateSpace, UpdateSpaceCommand

ENTITY_A = UUID(int=10)
ENTITY_B = UUID(int=20)


def _create(uow: InMemorySpaceUnitOfWork, ids: SequentialIdGenerator | None = None) -> CreateSpace:
    return CreateSpace(uow, FixedClock(), ids or SequentialIdGenerator())


def _update(uow: InMemorySpaceUnitOfWork) -> UpdateSpace:
    return UpdateSpace(uow)


def _seed(uow: InMemorySpaceUnitOfWork, ids: SequentialIdGenerator, **overrides: object):
    data: dict[str, object] = {
        "entity_id": ENTITY_A,
        "actor_role": MembershipRole.RESPONSIBLE,
        "name": "Sala 1",
        "capacity": 20,
        "equipment": "cadires",
    }
    data.update(overrides)
    return _create(uow, ids).execute(CreateSpaceCommand(**data))  # type: ignore[arg-type]


def test_update_space_changes_name_capacity_and_equipment() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids)
    result = _update(uow).execute(
        UpdateSpaceCommand(
            entity_id=ENTITY_A,
            space_id=created.space.id,
            actor_role=MembershipRole.RESPONSIBLE,
            name="  Sala Pau Casals  ",
            capacity=40,
            equipment="piano",
            active=True,
        )
    )
    space = GetSpace(uow).execute(ENTITY_A, created.space.id)
    assert space.name == "Sala Pau Casals"
    assert space.capacity == 40
    assert space.equipment == "piano"
    assert space.active is True
    assert space.id == result.space.id
    assert space.windows == created.space.windows


def test_update_keeps_own_name() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids)
    _update(uow).execute(
        UpdateSpaceCommand(
            entity_id=ENTITY_A,
            space_id=created.space.id,
            actor_role=MembershipRole.RESPONSIBLE,
            name="sala 1",
            capacity=25,
            equipment=None,
            active=True,
        )
    )
    space = GetSpace(uow).execute(ENTITY_A, created.space.id)
    assert space.name == "sala 1"
    assert space.capacity == 25
    assert space.equipment is None


def test_update_duplicate_name_same_entity_is_rejected() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    _seed(uow, ids, name="Sala 1")
    other = _seed(uow, ids, name="Sala 2", capacity=8)
    try:
        _update(uow).execute(
            UpdateSpaceCommand(
                entity_id=ENTITY_A,
                space_id=other.space.id,
                actor_role=MembershipRole.RESPONSIBLE,
                name="sala 1",
                capacity=8,
                active=True,
            )
        )
    except DuplicateSpaceNameError:
        pass
    else:
        raise AssertionError("expected DuplicateSpaceNameError")
    assert GetSpace(uow).execute(ENTITY_A, other.space.id).name == "Sala 2"


def test_deactivate_keeps_space_in_list() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids)
    _update(uow).execute(
        UpdateSpaceCommand(
            entity_id=ENTITY_A,
            space_id=created.space.id,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=20,
            equipment="cadires",
            active=False,
        )
    )
    spaces = ListSpaces(uow).execute(ENTITY_A)
    assert len(spaces) == 1
    assert spaces[0].id == created.space.id
    assert spaces[0].active is False
    assert spaces[0].name == "Sala 1"


def test_cannot_update_space_of_other_entity() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids, entity_id=ENTITY_B, name="Pista 1")
    try:
        _update(uow).execute(
            UpdateSpaceCommand(
                entity_id=ENTITY_A,
                space_id=created.space.id,
                actor_role=MembershipRole.RESPONSIBLE,
                name="Pista piratejada",
                capacity=99,
                active=True,
            )
        )
    except SpaceNotFoundError:
        pass
    else:
        raise AssertionError("expected SpaceNotFoundError")
    assert GetSpace(uow).execute(ENTITY_B, created.space.id).name == "Pista 1"


def test_get_space_does_not_leak_other_entity() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids, entity_id=ENTITY_B, name="Pista 1")
    try:
        GetSpace(uow).execute(ENTITY_A, created.space.id)
    except SpaceNotFoundError:
        pass
    else:
        raise AssertionError("expected SpaceNotFoundError")


def test_coordinator_cannot_update_space() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids)
    try:
        _update(uow).execute(
            UpdateSpaceCommand(
                entity_id=ENTITY_A,
                space_id=created.space.id,
                actor_role=MembershipRole.COORDINATOR,
                name="Sala 1",
                capacity=20,
                active=True,
            )
        )
    except ForbiddenError:
        pass
    else:
        raise AssertionError("expected ForbiddenError")
    assert GetSpace(uow).execute(ENTITY_A, created.space.id).capacity == 20


def test_update_blank_name_is_rejected() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids)
    try:
        _update(uow).execute(
            UpdateSpaceCommand(
                entity_id=ENTITY_A,
                space_id=created.space.id,
                actor_role=MembershipRole.RESPONSIBLE,
                name="   ",
                capacity=20,
                active=True,
            )
        )
    except InvalidSpaceError as exc:
        assert str(exc) == "el nom de l’espai és obligatori"
    else:
        raise AssertionError("expected InvalidSpaceError")
    assert GetSpace(uow).execute(ENTITY_A, created.space.id).name == "Sala 1"


def test_update_blank_equipment_is_stored_as_none() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids)
    result = _update(uow).execute(
        UpdateSpaceCommand(
            entity_id=ENTITY_A,
            space_id=created.space.id,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=20,
            equipment="   ",
            active=True,
        )
    )
    assert result.space.equipment is None


def test_update_min_attendance_zero_is_stored() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids, min_attendance=8)
    result = _update(uow).execute(
        UpdateSpaceCommand(
            entity_id=ENTITY_A,
            space_id=created.space.id,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 1",
            capacity=20,
            active=True,
            min_attendance=0,
            min_attendance_set=True,
        )
    )
    assert result.space.min_attendance == 0
    assert GetSpace(uow).execute(ENTITY_A, created.space.id).min_attendance == 0


def test_update_without_min_attendance_keeps_previous() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids, min_attendance=8)
    result = _update(uow).execute(
        UpdateSpaceCommand(
            entity_id=ENTITY_A,
            space_id=created.space.id,
            actor_role=MembershipRole.RESPONSIBLE,
            name="Sala 2",
            capacity=30,
            active=True,
        )
    )
    assert result.space.min_attendance == 8
    assert result.space.name == "Sala 2"


def test_negative_min_attendance_is_rejected() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids, min_attendance=8)
    try:
        _update(uow).execute(
            UpdateSpaceCommand(
                entity_id=ENTITY_A,
                space_id=created.space.id,
                actor_role=MembershipRole.RESPONSIBLE,
                name="Sala 1",
                capacity=20,
                active=True,
                min_attendance=-1,
                min_attendance_set=True,
            )
        )
    except InvalidSpaceError as exc:
        assert str(exc) == "l’aforament mínim ha de ser un enter igual o superior a zero"
    else:
        raise AssertionError("expected InvalidSpaceError")
    assert GetSpace(uow).execute(ENTITY_A, created.space.id).min_attendance == 8


def test_update_capacity_must_be_positive() -> None:
    uow = InMemorySpaceUnitOfWork()
    ids = SequentialIdGenerator()
    created = _seed(uow, ids)
    try:
        _update(uow).execute(
            UpdateSpaceCommand(
                entity_id=ENTITY_A,
                space_id=created.space.id,
                actor_role=MembershipRole.RESPONSIBLE,
                name="Sala 1",
                capacity=0,
                active=True,
            )
        )
    except InvalidSpaceError as exc:
        assert str(exc) == "l’aforament ha de ser un enter positiu"
    else:
        raise AssertionError("expected InvalidSpaceError")
    assert GetSpace(uow).execute(ENTITY_A, created.space.id).capacity == 20
