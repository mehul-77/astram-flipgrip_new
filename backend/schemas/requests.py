"""
Pydantic request schemas for all ASTRAM API endpoints.

Each schema validates and documents the JSON body expected by the
corresponding router.  Optional fields use sensible defaults so the
frontend can send minimal payloads when full data isn't available.
"""

from pydantic import BaseModel, Field
from typing import Optional


class PredictRequest(BaseModel):
    """Input for POST /api/predict — predicts incident duration & impact."""

    event_type: str = Field(
        default="unplanned",
        description="'planned' or 'unplanned'",
        examples=["unplanned"],
    )
    event_cause: str = Field(
        ...,
        description="Root cause category (e.g. 'vehicle_breakdown', 'accident')",
        examples=["water_logging"],
    )
    corridor: str = Field(
        ...,
        description="Corridor name",
        examples=["Mysore Road"],
    )
    junction: Optional[str] = Field(
        default=None,
        description="Junction name (optional)",
        examples=["SilkBoardJunction"],
    )
    zone: Optional[str] = Field(
        default=None,
        description="Zone name (optional)",
        examples=["South Zone 1"],
    )
    priority: str = Field(
        default="High",
        description="'High' or 'Low'",
        examples=["High"],
    )
    requires_road_closure: bool = Field(
        default=False,
        description="Whether the event requires road closure",
    )
    latitude: Optional[float] = Field(default=None, examples=[12.9716])
    longitude: Optional[float] = Field(default=None, examples=[77.5946])
    veh_type: Optional[str] = Field(default=None, examples=["truck"])
    reason_breakdown: Optional[str] = Field(default=None, examples=["engine_failure"])
    hour: Optional[int] = Field(
        default=None,
        ge=0,
        le=23,
        description="Hour of the event (0-23). Auto-detected from server time if omitted.",
    )


class RecommendRequest(BaseModel):
    """Input for POST /api/recommend — generates deployment recommendations."""

    event_cause: str = Field(..., examples=["water_logging"])
    corridor: str = Field(..., examples=["Mysore Road"])
    impact_score: float = Field(..., ge=0, le=100, examples=[84.0])
    zone: Optional[str] = Field(default=None, examples=["South Zone 1"])
    requires_road_closure: bool = Field(default=False)
    priority: str = Field(default="High", examples=["High"])
    duration_hours: Optional[float] = Field(
        default=None,
        description="Predicted duration in hours (used to refine recommendation)",
        examples=[16.0],
    )


class DNARequest(BaseModel):
    """Input for POST /api/dna — finds similar historical incidents."""

    event_cause: str = Field(..., examples=["water_logging"])
    corridor: str = Field(..., examples=["Mysore Road"])
    zone: Optional[str] = Field(default=None, examples=["South Zone 1"])
    priority: str = Field(default="High", examples=["High"])
    requires_road_closure: bool = Field(default=False)
    hour: int = Field(default=12, ge=0, le=23, examples=[14])
    k: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of similar events to return",
    )


class FeedbackRequest(BaseModel):
    """Input for POST /api/feedback — logs prediction accuracy feedback."""

    event_id: str = Field(..., description="ID of the event", examples=["FKID000042"])
    predicted_hrs: float = Field(..., ge=0, examples=[12.0])
    actual_hrs: float = Field(..., ge=0, examples=[18.0])
    event_cause: str = Field(..., examples=["water_logging"])
