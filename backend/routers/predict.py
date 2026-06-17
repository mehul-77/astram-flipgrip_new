"""
routers/predict.py
──────────────────
POST /api/predict — Predict incident duration, impact score, and
                    SHAP-based feature contributions.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from ml.features import engineer_single
from ml.shap_engine import explain
from schemas.requests import PredictRequest
from schemas.responses import PredictResponse, ShapFactor
from utils.loader import get_feature_maps, get_metrics, get_model, get_preprocessor
from utils.scoring import compute_impact_score, get_severity_tier

logger = logging.getLogger("astram.predict")

router = APIRouter(prefix="/api", tags=["Prediction"])


@router.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict incident impact",
    description=(
        "Given event metadata, predicts disruption duration (hours), "
        "computes an impact score (0-100), severity tier, and returns "
        "the top SHAP feature contributions."
    ),
)
async def predict(req: PredictRequest) -> PredictResponse:
    try:
        model = get_model()
        preprocessor = get_preprocessor()
        feature_maps = get_feature_maps()
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not trained yet. Run `python -m ml.train` first.",
        )

    # Build single-instance feature vector
    input_dict = req.model_dump()
    X_single = engineer_single(
        input_dict,
        preprocessor,
        corridor_freq=feature_maps["corridor_freq"],
        junction_freq=feature_maps["junction_freq"],
        corridor_risk=feature_maps["corridor_risk"],
        junction_risk=feature_maps["junction_risk"],
    )

    # Predict duration
    duration_pred = float(model.predict(X_single)[0])
    duration_pred = max(0.0, round(duration_pred, 2))

    # Impact score
    impact = compute_impact_score(
        duration_hours=duration_pred,
        requires_road_closure=req.requires_road_closure,
        priority=req.priority,
        event_type=req.event_type,
    )
    severity = get_severity_tier(impact)

    # SHAP explanation
    try:
        shap_factors = explain(model, preprocessor, X_single, top_k=5)
    except Exception as e:
        logger.warning("SHAP explanation failed: %s — returning empty factors", e)
        shap_factors = []

    # Confidence from model metrics
    metrics = get_metrics()
    r2 = 0.0
    if metrics:
        best = metrics.get("best_model", "")
        comparison = metrics.get("comparison", {})
        if best in comparison:
            r2 = comparison[best].get("r2", 0.0)
    confidence = round(max(0.0, r2) * 100, 1)

    return PredictResponse(
        duration_hours=duration_pred,
        impact_score=impact,
        severity=severity,
        shap_factors=[ShapFactor(**f) for f in shap_factors],
        confidence=confidence,
    )
