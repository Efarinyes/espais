from app.adapters.memory.identity import (
    FailingMembershipRepository,
    FixedClock,
    InMemoryIdentityUnitOfWork,
    PlainPasswordHasher,
    SequentialIdGenerator,
)
from app.domain.errors import DuplicateEmailError, InvalidRegistrationError
from app.domain.identity import MembershipRole
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand


def _command(**overrides: object) -> RegisterEntityCommand:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    return RegisterEntityCommand(**data)  # type: ignore[arg-type]


def _use_case(uow: InMemoryIdentityUnitOfWork | None = None) -> tuple[RegisterEntity, InMemoryIdentityUnitOfWork]:
    unit = uow or InMemoryIdentityUnitOfWork()
    return (
        RegisterEntity(unit, FixedClock(), SequentialIdGenerator(), PlainPasswordHasher()),
        unit,
    )


def test_register_entity_creates_entity_user_and_responsible_membership() -> None:
    use_case, uow = _use_case()
    result = use_case.execute(_command())

    assert len(uow.entities.list_all()) == 1
    entity = uow.entities.list_all()[0]
    assert entity.id == result.entity_id
    assert entity.name == "AAVV Barri A"
    assert entity.typology == "associació de veïns"
    assert entity.palette == "mar-cel"

    user = uow.users.get_by_email("anna@example.com")
    assert user is not None
    assert user.id == result.user_id
    assert user.password_hash == "hashed:secret123"

    memberships = uow.memberships.list_all()
    assert len(memberships) == 1
    assert memberships[0].entity_id == result.entity_id
    assert memberships[0].user_id == result.user_id
    assert memberships[0].role == MembershipRole.RESPONSIBLE


def test_duplicate_email_does_not_create_entity() -> None:
    use_case, uow = _use_case()
    use_case.execute(_command())

    try:
        use_case.execute(_command(entity_name="AAVV Barri B", email="Anna@example.com"))
    except DuplicateEmailError:
        pass
    else:
        raise AssertionError("expected DuplicateEmailError")

    assert len(uow.entities.list_all()) == 1
    assert len(uow.memberships.list_all()) == 1


def test_same_entity_name_allowed_for_two_tenants() -> None:
    use_case, uow = _use_case()
    first = use_case.execute(_command(email="a@example.com"))
    second = use_case.execute(
        _command(entity_name="AAVV Barri A", email="b@example.com", responsible_name="Berta")
    )
    assert first.entity_id != second.entity_id
    assert len(uow.entities.list_all()) == 2


def test_mid_failure_rolls_back_and_leaves_no_orphan_entity() -> None:
    uow = InMemoryIdentityUnitOfWork()
    uow.memberships = FailingMembershipRepository(uow)
    use_case, _ = _use_case(uow)

    try:
        use_case.execute(_command())
    except RuntimeError:
        pass
    else:
        raise AssertionError("expected RuntimeError")

    assert uow.entities.list_all() == []
    assert uow.users.get_by_email("anna@example.com") is None
    assert uow.memberships.list_all() == []


def test_blank_entity_name_is_rejected() -> None:
    use_case, uow = _use_case()
    try:
        use_case.execute(_command(entity_name="  "))
    except InvalidRegistrationError:
        pass
    else:
        raise AssertionError("expected InvalidRegistrationError")
    assert uow.entities.list_all() == []
