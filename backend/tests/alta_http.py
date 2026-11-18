"""Alta de prova: el registre queda pendent i la sessió s’obre amb el compte ja verificat."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.sqlalchemy.models import EntityRow, MembershipRow, UserRow
from tests.sessio_http import inicia_sessio


def _activar(session: Session, email: str) -> None:
    user = session.scalar(select(UserRow).where(UserRow.email == email.strip().lower()))
    assert user is not None
    ara = datetime.now(UTC)
    user.email_verified_at = ara
    membership = session.scalar(select(MembershipRow).where(MembershipRow.user_id == user.id))
    assert membership is not None
    entity = session.get(EntityRow, membership.entity_id)
    assert entity is not None
    if entity.activated_at is None:
        entity.activated_at = ara
    session.commit()


def alta_i_sessio(client: TestClient, **overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "entity_name": "AAVV Barri A",
        "typology": "associació de veïns",
        "responsible_name": "Anna",
        "email": "anna@example.com",
        "password": "secret123",
    }
    data.update(overrides)
    response = client.post("/registre", json=data)
    assert response.status_code == 201, response.text
    db = client.app.state.session_factory()
    try:
        _activar(db, str(data["email"]))
    finally:
        db.close()
    sessio = inicia_sessio(client, str(data["email"]), str(data["password"]))
    assert sessio.status_code == 200, sessio.text
    return sessio.json()
