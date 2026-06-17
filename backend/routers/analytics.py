"""
routers/analytics.py
────────────────────
GET /api/analytics — Return pre-computed analytics data as
                     frontend-ready JSON.

Sub-endpoints:
  GET /api/analytics/corridors
  GET /api/analytics/junctions
  GET /api/analytics/hourly
  GET /api/analytics/monthly
  GET /api/analytics/cascade

The main endpoint aggregates all of the above into a single response.
"""

from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, status

from schemas.responses import (
    AnalyticsResponse,
    CascadeStat,
    CorridorRisk,
    HourlyBucket,
    JunctionRisk,
    MonthlyBucket,
)
from utils.loader import (
    get_cascade_stats,
    get_corridor_risk,
    get_hourly_distribution,
    get_junction_risk,
    get_monthly_trend,
)

logger = logging.getLogger("astram.analytics")

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# ── Helpers ──────────────────────────────────────────────────────

def _corridors() -> List[CorridorRisk]:
    df = get_corridor_risk()
    if df.empty:
        return []
    return [
        CorridorRisk(
            corridor=row["corridor"],
            incident_count=int(row["incident_count"]),
            avg_duration=round(float(row["avg_duration"]), 2),
            risk_score=round(float(row["risk_score"]), 2),
        )
        for _, row in df.iterrows()
    ]


def _junctions() -> List[JunctionRisk]:
    df = get_junction_risk()
    if df.empty:
        return []
    return [
        JunctionRisk(
            junction=row["junction"],
            incident_count=int(row["incident_count"]),
            avg_duration=round(float(row["avg_duration"]), 2),
            risk_score=round(float(row["risk_score"]), 2),
        )
        for _, row in df.iterrows()
    ]


def _hourly() -> List[HourlyBucket]:
    df = get_hourly_distribution()
    if df.empty:
        return []
    return [
        HourlyBucket(hour=int(row["hour"]), incident_count=int(row["incident_count"]))
        for _, row in df.iterrows()
    ]


def _monthly() -> List[MonthlyBucket]:
    df = get_monthly_trend()
    if df.empty:
        return []
    return [
        MonthlyBucket(month=int(row["month"]), incident_count=int(row["incident_count"]))
        for _, row in df.iterrows()
    ]


def _cascade() -> List[CascadeStat]:
    df = get_cascade_stats()
    if df.empty:
        return []
    return [
        CascadeStat(
            corridor=row["corridor"],
            cascade_count=int(row["cascade_count"]),
            avg_duration=round(float(row["avg_duration"]), 2),
        )
        for _, row in df.iterrows()
    ]


# ── Endpoints ────────────────────────────────────────────────────

@router.get(
    "",
    response_model=AnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Full analytics dashboard data",
)
async def analytics_all() -> AnalyticsResponse:
    corridor_risk = _corridors()
    junction_risk = _junctions()
    hourly = _hourly()
    monthly = _monthly()
    cascade = _cascade()

    total_events = sum(c.incident_count for c in corridor_risk)
    avg_dur = 0.0
    if corridor_risk:
        weighted = sum(c.avg_duration * c.incident_count for c in corridor_risk)
        avg_dur = round(weighted / max(total_events, 1), 2)

    # Closure rate (approximate from corridor_risk — those with high risk tend to have closures)
    closure_rate = 0.0
    if total_events > 0:
        high_risk = sum(1 for c in corridor_risk if c.risk_score > 500)
        closure_rate = round(high_risk / max(len(corridor_risk), 1) * 100, 1)

    return AnalyticsResponse(
        corridor_risk=corridor_risk,
        junction_risk=junction_risk,
        hourly_distribution=hourly,
        monthly_trend=monthly,
        cascade_stats=cascade,
        total_events=total_events,
        avg_duration_hours=avg_dur,
        closure_rate=closure_rate,
    )


@router.get("/corridors", response_model=List[CorridorRisk], summary="Corridor risk data")
async def analytics_corridors():
    return _corridors()


@router.get("/junctions", response_model=List[JunctionRisk], summary="Junction risk data")
async def analytics_junctions():
    return _junctions()


@router.get("/hourly", response_model=List[HourlyBucket], summary="Hourly distribution")
async def analytics_hourly():
    return _hourly()


@router.get("/monthly", response_model=List[MonthlyBucket], summary="Monthly trend")
async def analytics_monthly():
    return _monthly()


@router.get("/cascade", response_model=List[CascadeStat], summary="Cascade statistics")
async def analytics_cascade():
    return _cascade()
