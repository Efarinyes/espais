"""Regla comuna de contrasenya: mínim de 8 caràcters i el sostre de 72 bytes de bcrypt."""

import pytest

from app.adapters.security import BcryptPasswordHasher
from app.domain.errors import InvalidRegistrationError
from app.domain.identity import require_valid_password


@pytest.mark.parametrize("raw", ["12345678", "x" * 72, "à" * 36])
def test_accepta_del_minim_al_sostre(raw: str) -> None:
    require_valid_password(raw)
    hashed = BcryptPasswordHasher().hash(raw)
    assert BcryptPasswordHasher().verify(raw, hashed)


@pytest.mark.parametrize(
    ("raw", "missatge"),
    [("1234567", "massa curta"), ("x" * 73, "massa llarga"), ("à" * 37, "massa llarga")],
)
def test_rebutja_fora_de_marge(raw: str, missatge: str) -> None:
    with pytest.raises(InvalidRegistrationError, match=missatge):
        require_valid_password(raw)
