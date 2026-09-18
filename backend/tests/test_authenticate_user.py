from app.adapters.memory.identity import (
    FixedClock,
    InMemoryIdentityUnitOfWork,
    PlainPasswordHasher,
    SequentialIdGenerator,
)
from app.domain.errors import InvalidCredentialsError
from app.domain.identity import MembershipRole
from app.usecases.authenticate_user import AuthenticateUser, AuthenticateUserCommand
from app.usecases.register_entity import RegisterEntity, RegisterEntityCommand
from app.usecases.resolve_session import ResolveSession


def _register(
    uow: InMemoryIdentityUnitOfWork,
    ids: SequentialIdGenerator | None = None,
    **overrides: object,
) -> tuple:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    generator = ids or SequentialIdGenerator()
    return RegisterEntity(
        uow, FixedClock(), generator, PlainPasswordHasher()
    ).execute(RegisterEntityCommand(**data))  # type: ignore[arg-type]


def test_authenticate_returns_entity_of_the_membership() -> None:
    uow = InMemoryIdentityUnitOfWork()
    registered = _register(uow)
    view = AuthenticateUser(uow, PlainPasswordHasher()).execute(
        AuthenticateUserCommand(email="Anna@example.com", password="secret123")
    )
    assert view.user_id == registered.user_id
    assert view.entity_id == registered.entity_id
    assert view.role == MembershipRole.RESPONSIBLE
    assert view.entity_name == "AAVV Barri A"
    assert view.user_name == "Anna"
    assert view.typology == "associació de veïns"
    assert view.palette == "mar-cel"


def test_wrong_password_does_not_reveal_account() -> None:
    uow = InMemoryIdentityUnitOfWork()
    _register(uow)
    try:
        AuthenticateUser(uow, PlainPasswordHasher()).execute(
            AuthenticateUserCommand(email="anna@example.com", password="wrongpass")
        )
    except InvalidCredentialsError:
        pass
    else:
        raise AssertionError("expected InvalidCredentialsError")


def test_unknown_email_same_error_as_wrong_password() -> None:
    uow = InMemoryIdentityUnitOfWork()
    try:
        AuthenticateUser(uow, PlainPasswordHasher()).execute(
            AuthenticateUserCommand(email="ningú@example.com", password="secret123")
        )
    except InvalidCredentialsError:
        pass
    else:
        raise AssertionError("expected InvalidCredentialsError")


def test_each_user_resolves_only_their_entity() -> None:
    uow = InMemoryIdentityUnitOfWork()
    ids = SequentialIdGenerator()
    first = _register(uow, ids, email="a@example.com", entity_name="Entitat A")
    second = _register(
        uow,
        ids,
        email="b@example.com",
        entity_name="Entitat B",
        responsible_name="Berta",
        password="secret456",
    )
    hasher = PlainPasswordHasher()
    view_a = AuthenticateUser(uow, hasher).execute(
        AuthenticateUserCommand(email="a@example.com", password="secret123")
    )
    view_b = AuthenticateUser(uow, hasher).execute(
        AuthenticateUserCommand(email="b@example.com", password="secret456")
    )
    assert view_a.entity_id == first.entity_id
    assert view_b.entity_id == second.entity_id
    assert view_a.entity_id != view_b.entity_id
    assert ResolveSession(uow).execute(first.user_id).entity_name == "Entitat A"
    assert ResolveSession(uow).execute(second.user_id).entity_name == "Entitat B"


def test_resolve_session_ignores_foreign_entity_id() -> None:
    """La sessió es reconstrueix per user_id; no es pot ‘triar’ l’entitat B."""
    uow = InMemoryIdentityUnitOfWork()
    ids = SequentialIdGenerator()
    first = _register(uow, ids, email="a@example.com", entity_name="Entitat A")
    second = _register(uow, ids, email="b@example.com", entity_name="Entitat B")
    view = ResolveSession(uow).execute(first.user_id)
    assert view.entity_id == first.entity_id
    assert view.entity_id != second.entity_id
    assert view.entity_name == "Entitat A"
