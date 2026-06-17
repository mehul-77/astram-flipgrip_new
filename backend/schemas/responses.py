"""
Pydantic response schemas for all ASTRAM API endpoints.

These models define the exact JSON shapes returned to the Next.js
frontend, ensuring type-safe serialization and automatic OpenAPI
documentation.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# ── Predict ──────────────────────────────────────────────────────

class ShapFactor(BaseModel):
    """A single SHAP feature contribution."""
    feature: str
    contribution: float = Field(description="Absolute SHAP value (percentage-like)")


class PredictResponse(BaseModel):
    """Response from POST /api/predict."""
    duration_hours: float = Field(description="Predicted disruption duration")
    impact_score: float = Field(description="0-100 composite impact score")
    severity: str = Field(description="Low / Medium / High / Critical")
    shap_factors: List[ShapFactor] = Field(description="Top contributing features")
    confidence: float = Field(
        description="Model confidence (R² based) as a percentage",
    )


# ── Recommend ────────────────────────────────────────────────────

class RecommendResponse(BaseModel):
    """Response from POST /api/recommend."""
    officers: int = Field(description="Recommended officer count")
    barricade_points: List[str] = Field(description="Suggested barricade locations")
    diversion_route: str = Field(description="Suggested diversion route description")
    est_resolution_hrs: float = Field(description="Estimated resolution time (hours)")
    cost_of_delay: float = Field(description="Estimated economic cost of delay (INR)")
    playbook: List[str] = Field(description="Step-by-step action items")
    severity: str = Field(description="Severity tier")


# ── DNA / Similar Events ────────────────────────────────────────

class SimilarEvent(BaseModel):
    """A single similar historical event."""
    similarity_pct: float = Field(description="Similarity percentage (0-100)")
    event_cause: str
    corridor: str
    zone: Optional[str] = None
    priority: str
    resolution_hrs: float = Field(description="Actual resolution time in hours")
    playbook: List[str] = Field(default_factory=list)


class DNAResponse(BaseModel):
    """Response from POST /api/dna."""
    query_summary: str
    matches: List[SimilarEvent]


# ── Analytics ────────────────────────────────────────────────────

class CorridorRisk(BaseModel):
    corridor: str
    incident_count: int
    avg_duration: float
    risk_score: float


class JunctionRisk(BaseModel):
    junction: str
    incident_count: int
    avg_duration: float
    risk_score: float


class HourlyBucket(BaseModel):
    hour: int
    incident_count: int


class MonthlyBucket(BaseModel):
    month: int
    incident_count: int


class CascadeStat(BaseModel):
    corridor: str
    cascade_count: int
    avg_duration: float


class AnalyticsResponse(BaseModel):
    """Response from GET /api/analytics."""
    corridor_risk: List[CorridorRisk]
    junction_risk: List[JunctionRisk]
    hourly_distribution: List[HourlyBucket]
    monthly_trend: List[MonthlyBucket]
    cascade_stats: List[CascadeStat]
    total_events: int
    avg_duration_hours: float
    closure_rate: float


# ── Feedback ─────────────────────────────────────────────────────

class FeedbackResponse(BaseModel):
    """Response from POST /api/feedback."""
    logged: bool
    drift_pct: float = Field(description="Relative prediction error %")
    status: str = Field(description="STABLE or DRIFTING")
    category_drift: Optional[Dict[str, float]] = Field(
        default=None,
        description="Per-event-cause drift percentages",
    )


# ── Health ───────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    model_loaded: bool = False
    version: str = "1.0.0"
