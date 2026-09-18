"""Identitat: entitat, usuari i membership. Sense I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

DEFAULT_ENTITY_PALETTE = "mar-cel"
ENTITY_PALETTES = frozenset({"mar-cel", "camps", "citrics", "vinyes"})


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


@dataclass(frozen=True)
class Membership:
    id: UUID
    user_id: UUID
    entity_id: UUID
    role: MembershipRole
