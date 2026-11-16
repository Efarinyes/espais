"""Activa un compte de prova ja creat. No és el flux de verificació."""

from __future__ import annotations

from dataclasses import replace

from app.adapters.memory.identity import InMemoryIdentityUnitOfWork


def activar_en_memoria(uow: InMemoryIdentityUnitOfWork, email: str) -> None:
    user = uow.users.get_by_email(email.strip().lower())
    assert user is not None
    moment = user.created_at
    uow.users.save(replace(user, email_verified_at=moment))
    membership = uow.memberships.get_by_user_id(user.id)
    assert membership is not None
    entity = uow.entities.get_by_id(membership.entity_id)
    assert entity is not None
    if entity.activated_at is None:
        uow.entities.save(replace(entity, activated_at=moment))
    uow.commit()
