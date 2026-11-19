"""Text d’un avís per a canals que no tenen interfície pròpia (Web Push). Sense I/O."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.domain.notification import (
    CHANGE_DATE,
    CHANGE_END_TIME,
    CHANGE_START_TIME,
    Notification,
    NotificationType,
)
from app.domain.reservation import MADRID, as_utc

_DIES = ("dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte", "diumenge")
_MESOS = (
    "gener",
    "febrer",
    "març",
    "abril",
    "maig",
    "juny",
    "juliol",
    "agost",
    "setembre",
    "octubre",
    "novembre",
    "desembre",
)
_ELISIO = {"abril", "agost", "octubre"}
_ETIQUETA_CANVI = {
    CHANGE_DATE: "el dia",
    CHANGE_START_TIME: "l’hora d’inici",
    CHANGE_END_TIME: "l’hora de fi",
}


@dataclass(frozen=True)
class PushMessage:
    title: str
    body: str
    url: str
    tag: str


def _moment(iso: str) -> datetime | None:
    try:
        return as_utc(datetime.fromisoformat(iso)).astimezone(MADRID)
    except ValueError:
        return None


def _hora(moment: datetime) -> str:
    return f"{moment.hour:02d}:{moment.minute:02d}"


def descripcio_interval(starts_at: str, ends_at: str) -> str:
    """«dilluns 9 de novembre, 17:00–18:00», en hora de Madrid."""
    inici = _moment(starts_at)
    fi = _moment(ends_at)
    if inici is None or fi is None:
        return f"{starts_at}–{ends_at}"
    mes = _MESOS[inici.month - 1]
    de = "d’" if mes in _ELISIO else "de "
    return f"{_DIES[inici.weekday()]} {inici.day} {de}{mes}, {_hora(inici)}–{_hora(fi)}"


def _llista(items: list[str]) -> str:
    if len(items) <= 1:
        return "".join(items)
    return f"{', '.join(items[:-1])} i {items[-1]}"


def descripcio_canvis(changes: tuple[str, ...]) -> str:
    """«el dia i l’hora d’inici». Buit si no hi ha canvis coneguts."""
    return _llista([_ETIQUETA_CANVI[item] for item in changes if item in _ETIQUETA_CANVI])


def missatge_push(notification: Notification) -> PushMessage:
    payload = notification.payload
    original = descripcio_interval(payload.starts_at, payload.ends_at)
    tag = f"avis-{notification.id}"
    url = f"/avisos?avis={notification.id}"
    if notification.type == NotificationType.RESERVATION_RESCHEDULED:
        parts = [f"Abans: {original}."]
        if payload.new_starts_at and payload.new_ends_at:
            parts.append(f"Ara: {descripcio_interval(payload.new_starts_at, payload.new_ends_at)}.")
        canvis = descripcio_canvis(payload.changes)
        if canvis:
            parts.append(f"Ha canviat {canvis}.")
        if payload.reason:
            parts.append(f"Motiu: {payload.reason}.")
        return PushMessage(
            title=f"Reserva modificada: {payload.space_name}",
            body=" ".join(parts),
            url=url,
            tag=tag,
        )
    parts = [f"Horari original: {original}.", "La reserva ha estat anul·lada."]
    if payload.reason:
        parts.append(f"Motiu: {payload.reason}.")
    return PushMessage(
        title=f"Reserva anul·lada: {payload.space_name}",
        body=" ".join(parts),
        url=url,
        tag=tag,
    )
