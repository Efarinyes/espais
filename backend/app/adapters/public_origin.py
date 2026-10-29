"""Origen públic dels enllaços. Mai un hostname intern de Docker."""

from __future__ import annotations

import os


def origen_public() -> str:
    raw = os.environ.get("ESPAIS_DOMAIN", "").strip().rstrip("/")
    if not raw:
        return ""
    if "://" in raw:
        return raw
    return f"https://{raw}"
