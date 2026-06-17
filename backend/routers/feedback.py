"""
routers/feedback.py
───────────────────
POST /api/feedback — Log prediction accuracy feedback and return
                     drift status.
GET  /api/feedback/drift — Retrieve current drift summary without
                           logging new data.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, status

from schemas.requests import FeedbackRequest
from schemas.responses import FeedbackResponse
from utils.drift import get_drift_summary, log_feedback

logger = logging.getLogger("astram.feedback")

router = APIRouter(prefix="/api", tags=["Feedback & Drift"])


@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_200_OK,
    summary="Log prediction feedback",
    description=(
        "Submit actual vs predicted duration for an event. "
        "Returns drift percentage and status (STABLE / DRIFTING)."
    ),
)
async def submit_feedback(req: FeedbackRequest) -> FeedbackResponse:
    result = log_feedback(
        event_id=req.event_id,
        predicted_hrs=req.predicted_hrs,
        actual_hrs=req.actual_hrs,
        event_cause=req.event_cause,
    )

    logger.info(
        "Feedback logged: event=%s  pred=%.1f  actual=%.1f  drift=%.1f%%  status=%s",
        req.event_id,
        req.predicted_hrs,
        req.actual_hrs,
        result["drift_pct"],
        result["status"],
    )

    return FeedbackResponse(**result)


@router.get(
    "/feedback/drift",
    status_code=status.HTTP_200_OK,
    summary="Current drift summary",
)
async def drift_status():
    return get_drift_summary()
