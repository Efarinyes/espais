"""Canal Socket.IO del login. El secret el crea el servidor i només el rep aquella connexió."""

from __future__ import annotations

import threading
from collections.abc import Awaitable, Callable
from datetime import datetime
from secrets import token_urlsafe
from typing import Protocol
from uuid import UUID

from app.adapters.login_challenges import LoginChallengeStore
from app.domain.errors import LoginConnectionError


class _Sender(Protocol):
    def __call__(self, sid: str, payload: dict[str, str]) -> Awaitable[None]: ...


class LoginHub:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sid_channel: dict[str, str] = {}
        self._channel_sid: dict[str, str] = {}
        self._sockets: set[str] = set()
        self._pending: dict[str, dict[str, str]] = {}
        self._sender: _Sender | None = None

    def set_sender(self, sender: _Sender) -> None:
        self._sender = sender

    def open(self, sid: str | None = None, *, socket: bool = False) -> str:
        channel = token_urlsafe(32)
        sid = sid or token_urlsafe(18)
        with self._lock:
            previous = self._sid_channel.pop(sid, None)
            if previous is not None:
                self._channel_sid.pop(previous, None)
                self._pending.pop(previous, None)
            self._sid_channel[sid] = channel
            self._channel_sid[channel] = sid
            if socket:
                self._sockets.add(sid)
            else:
                self._sockets.discard(sid)
        return channel

    def close(self, sid: str) -> str | None:
        with self._lock:
            channel = self._sid_channel.pop(sid, None)
            self._sockets.discard(sid)
            if channel is not None:
                self._channel_sid.pop(channel, None)
                self._pending.pop(channel, None)
            return channel

    def live(self, channel: str) -> bool:
        with self._lock:
            sid = self._channel_sid.get(channel)
            return sid is not None and self._sid_channel.get(sid) == channel

    def reserve(self, channel: str, challenge_id: UUID, code: str, expires_at: datetime) -> bool:
        with self._lock:
            sid = self._channel_sid.get(channel)
            if sid is None or self._sid_channel.get(sid) != channel:
                return False
            self._pending[channel] = {
                "challenge_id": str(challenge_id),
                "code": code,
                "expires_at": expires_at.isoformat(),
            }
            return True

    def last_code(self, channel: str) -> str | None:
        with self._lock:
            payload = self._pending.get(channel)
            return None if payload is None else payload["code"]

    def clear(self, channel: str) -> None:
        with self._lock:
            self._pending.pop(channel, None)

    def sid_for(self, channel: str) -> str | None:
        with self._lock:
            return self._channel_sid.get(channel)

    async def emit(self, channel: str) -> None:
        with self._lock:
            sid = self._channel_sid.get(channel)
            payload = self._pending.get(channel)
            is_socket = sid in self._sockets if sid is not None else False
            sender = self._sender
            data = dict(payload) if payload is not None else None
        if data is None or sid is None:
            raise LoginConnectionError()
        if not is_socket or sender is None:
            return
        try:
            await sender(sid, data)
        except Exception:  # noqa: BLE001
            raise LoginConnectionError() from None


def tanca_connexio(hub: LoginHub, store: LoginChallengeStore, sid: str, now: datetime) -> None:
    channel = hub.close(sid)
    if channel is not None:
        store.invalidate_channel(channel, now, "disconnected")


def bind_login_socket(
    sio: object,
    hub: LoginHub,
    store: LoginChallengeStore,
    now: Callable[[], datetime],
) -> None:
    async def sender(sid: str, payload: dict[str, str]) -> None:
        await sio.emit("verificacio:codi", payload, to=sid)  # type: ignore[attr-defined]

    hub.set_sender(sender)

    @sio.event  # type: ignore[attr-defined]
    async def connect(sid: str, environ: dict[str, object], auth: object = None) -> None:
        del environ, auth
        channel = hub.open(sid, socket=True)
        await sio.emit("verificacio:canal", {"channel": channel}, to=sid)  # type: ignore[attr-defined]

    @sio.event  # type: ignore[attr-defined]
    async def disconnect(sid: str) -> None:
        tanca_connexio(hub, store, sid, now())
