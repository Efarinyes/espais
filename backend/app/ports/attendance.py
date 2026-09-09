"""Port d’estratègia d’assistència. v1: count."""

from __future__ import annotations

from typing import Protocol

from app.domain.attendance import AttendanceValue


class AttendanceStrategy(Protocol):
    def apply(self, count: int) -> AttendanceValue: ...
