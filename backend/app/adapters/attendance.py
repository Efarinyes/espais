"""Estratègia count: enter ≥ 0. Sense persistència."""

from __future__ import annotations

from app.domain.attendance import COUNT_STRATEGY, AttendanceValue
from app.domain.errors import InvalidAttendanceError


class CountAttendance:
    def apply(self, count: int) -> AttendanceValue:
        if isinstance(count, bool) or not isinstance(count, int) or count < 0:
            raise InvalidAttendanceError("l’assistència ha de ser un enter ≥ 0")
        return AttendanceValue(strategy=COUNT_STRATEGY, count=count)
