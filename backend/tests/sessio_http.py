"""Obre el canal de prova i completa el codi. El codi no viatja a la resposta HTTP."""

from __future__ import annotations

from fastapi.testclient import TestClient


def inicia_sessio(client: TestClient, email: str, password: str):  # type: ignore[no-untyped-def]
    hub = client.app.state.login_hub
    channel = hub.open()
    started = client.post(
        "/sessio",
        json={"email": email, "password": password, "channel": channel},
    )
    if started.status_code != 200:
        return started
    body = started.json()
    assert set(body) == {"challenge_id", "expires_at"}, body
    code = hub.last_code(channel)
    assert code
    assert code not in started.text
    return client.post(
        "/sessio/verificacio",
        json={"challenge_id": body["challenge_id"], "code": code, "channel": channel},
    )
