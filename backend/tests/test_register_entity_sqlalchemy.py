from app.adapters.memory.identity import FixedClock
from app.adapters.security import BcryptPasswordHasher
from app.adapters.sqlalchemy.identity import (
    FailingSqlAlchemyMembershipRepository,
    SqlAlchemyIdentityUnitOfWork,
)
from app.adapters.system import UuidIdGenerator
from app.domain.errors import DuplicateEmailError
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


def test_sqlalchemy_register_persists_entity_user_and_membership(sqlite_session_factory) -> None:
    uow = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    try:
        result = RegisterEntity(
            uow, FixedClock(), UuidIdGenerator(), BcryptPasswordHasher()
        ).execute(_command())
    finally:
        uow.close()

    reader = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    try:
        entities = reader.entities.list_all()
        assert len(entities) == 1
        assert entities[0].id == result.entity_id
        assert entities[0].name == "AAVV Barri A"

        user = reader.users.get_by_email("anna@example.com")
        assert user is not None
        assert user.id == result.user_id
        assert user.password_hash != "secret123"
        assert user.password_hash.startswith("$2")

        memberships = reader.memberships.list_all()
        assert len(memberships) == 1
        assert memberships[0].entity_id == result.entity_id
        assert memberships[0].user_id == result.user_id
        assert memberships[0].role == MembershipRole.RESPONSIBLE
    finally:
        reader.close()


def test_sqlalchemy_duplicate_email_leaves_single_entity(sqlite_session_factory) -> None:
    first = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    try:
        RegisterEntity(
            first, FixedClock(), UuidIdGenerator(), BcryptPasswordHasher()
        ).execute(_command())
    finally:
        first.close()

    second = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    try:
        RegisterEntity(
            second, FixedClock(), UuidIdGenerator(), BcryptPasswordHasher()
        ).execute(_command(entity_name="AAVV Barri B", email="Anna@example.com"))
    except DuplicateEmailError:
        pass
    else:
        raise AssertionError("expected DuplicateEmailError")
    finally:
        second.close()

    reader = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    try:
        assert len(reader.entities.list_all()) == 1
        assert len(reader.memberships.list_all()) == 1
    finally:
        reader.close()


def test_sqlalchemy_same_entity_name_allowed(sqlite_session_factory) -> None:
    first = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    try:
        a = RegisterEntity(
            first, FixedClock(), UuidIdGenerator(), BcryptPasswordHasher()
        ).execute(_command(email="a@example.com"))
    finally:
        first.close()

    second = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    try:
        b = RegisterEntity(
            second, FixedClock(), UuidIdGenerator(), BcryptPasswordHasher()
        ).execute(_command(entity_name="AAVV Barri A", email="b@example.com"))
    finally:
        second.close()

    assert a.entity_id != b.entity_id
    reader = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    try:
        assert len(reader.entities.list_all()) == 2
    finally:
        reader.close()


def test_sqlalchemy_mid_failure_rolls_back(sqlite_session_factory) -> None:
    uow = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    uow.memberships = FailingSqlAlchemyMembershipRepository(uow._session)
    try:
        RegisterEntity(
            uow, FixedClock(), UuidIdGenerator(), BcryptPasswordHasher()
        ).execute(_command())
    except RuntimeError:
        pass
    else:
        raise AssertionError("expected RuntimeError")
    finally:
        uow.close()

    reader = SqlAlchemyIdentityUnitOfWork(sqlite_session_factory)
    try:
        assert reader.entities.list_all() == []
        assert reader.users.get_by_email("anna@example.com") is None
        assert reader.memberships.list_all() == []
    finally:
        reader.close()
