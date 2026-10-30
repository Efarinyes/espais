"""Identitat: entitat, usuari i membership. Sense I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from app.domain.errors import InvalidRegistrationError

DEFAULT_ENTITY_PALETTE = "mar-cel"
ENTITY_PALETTES = frozenset({"mar-cel", "camps", "citrics", "vinyes"})

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72


def require_valid_password(raw: str) -> None:
    if len(raw) < MIN_PASSWORD_LENGTH:
        raise InvalidRegistrationError("la contrasenya és massa curta")
    if len(raw.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise InvalidRegistrationError("la contrasenya és massa llarga")


class MembershipRole(StrEnum):
    RESPONSIBLE = "responsible"
    COORDINATOR = "coordinator"


@dataclass(frozen=True)
class Entity:
    id: UUID
    name: str
    typology: str | None
    created_at: datetime
    palette: str = DEFAULT_ENTITY_PALETTE


@dataclass(frozen=True)
class User:
    id: UUID
    name: str
    email: str
    password_hash: str
    created_at: datetime
    session_version: int = 0


@dataclass(frozen=True)
class Membership:
    id: UUID
    user_id: UUID
    entity_id: UUID
    role: MembershipRole
