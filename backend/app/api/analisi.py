"""HTTP d’anàlisi d’ús: sessió aporta entity_id; el router no agrega."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import AnalysisHttp, get_analysis_http, require_session
from app.domain.errors import ForbiddenError
from app.usecases.get_usage_summary import (
    GetUsageSummaryQuery,
    SpaceUsageRow,
    UsageSummary,
)
from app.usecases.resolve_session import SessionView

router = APIRouter()


class SpaceUsageResponse(BaseModel):
    space_id: UUID
    space_name: str
    capacity: int
    min_attendance: int | None
    confirmed_count: int
    cancelled_count: int
    reserved_hours: float
    available_hours: float
    occupancy_ratio: float
    average_attendance: float | None
    unregistered_count: int
    below_min_attendance: bool


class UsageSummaryResponse(BaseModel):
    starts_at: datetime
    ends_at: datetime
    confirmed_count: int
    cancelled_count: int
    reserved_hours: float
    available_hours: float
    occupancy_ratio: float
    average_attendance: float | None
    unregistered_count: int
    below_min_attendance: bool
    spaces: list[SpaceUsageResponse]


def _space_to_response(row: SpaceUsageRow) -> SpaceUsageResponse:
    return SpaceUsageResponse(
        space_id=row.space_id,
        space_name=row.space_name,
        capacity=row.capacity,
        min_attendance=row.min_attendance,
        confirmed_count=row.confirmed_count,
        cancelled_count=row.cancelled_count,
        reserved_hours=row.reserved_hours,
        available_hours=row.available_hours,
        occupancy_ratio=row.occupancy_ratio,
        average_attendance=row.average_attendance,
        unregistered_count=row.unregistered_count,
        below_min_attendance=row.below_min_attendance,
    )


def _to_response(summary: UsageSummary) -> UsageSummaryResponse:
    return UsageSummaryResponse(
        starts_at=summary.starts_at,
        ends_at=summary.ends_at,
        confirmed_count=summary.confirmed_count,
        cancelled_count=summary.cancelled_count,
        reserved_hours=summary.reserved_hours,
        available_hours=summary.available_hours,
        occupancy_ratio=summary.occupancy_ratio,
        average_attendance=summary.average_attendance,
        unregistered_count=summary.unregistered_count,
        below_min_attendance=summary.below_min_attendance,
        spaces=[_space_to_response(row) for row in summary.spaces],
    )


@router.get("/analisi", response_model=UsageSummaryResponse)
def get_usage_summary(
    view: Annotated[SessionView, Depends(require_session)],
    analysis: Annotated[AnalysisHttp, Depends(get_analysis_http)],
    des: Annotated[datetime, Query()],
    fins: Annotated[datetime, Query()],
    espai_id: Annotated[UUID | None, Query()] = None,
) -> UsageSummaryResponse:
    try:
        summary = analysis.summary.execute(
            GetUsageSummaryQuery(
                entity_id=view.entity_id,
                actor_role=view.role,
                starts_at=des,
                ends_at=fins,
                space_id=espai_id,
            )
        )
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from None
    return _to_response(summary)
