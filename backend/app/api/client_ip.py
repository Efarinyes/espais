"""IP del client quan Caddy és l’únic proxy de confiança."""

from __future__ import annotations

import ipaddress

from fastapi import Request


def _privada(host: str) -> bool:
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return False
    return address.is_private or address.is_loopback


def client_ip(request: Request) -> str:
    peer = request.client.host if request.client is not None else ""
    forwarded = request.headers.get("x-forwarded-for", "")
    if peer and _privada(peer) and forwarded.strip():
        return forwarded.split(",")[-1].strip()
    return peer or "desconeguda"
