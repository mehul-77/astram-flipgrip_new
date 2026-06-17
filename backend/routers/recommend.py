"""
routers/recommend.py
────────────────────
POST /api/recommend — Generate deployment recommendations based on
                      incident impact and corridor risk data.

The recommendation engine is rule-based, scaling officer count,
barricade points, diversion routes, and estimated costs by:
  • impact score
  • corridor risk
  • road closure requirement
  • historical duration
"""

from __future__ import annotations

import logging
from typing import Dict, List

from fastapi import APIRouter, status

from schemas.requests import RecommendRequest
from schemas.responses import RecommendResponse
from utils.loader import get_corridor_risk
from utils.scoring import get_severity_tier

logger = logging.getLogger("astram.recommend")

router = APIRouter(prefix="/api", tags=["Recommendation"])

# ── Diversion Route Templates ────────────────────────────────────

_DIVERSION_ROUTES: Dict[str, str] = {
    "Mysore Road": "Use Chord Road → Magadi Road → Tumkur Road bypass",
    "Hosur Road": "Divert via Bannerghatta Road → Kanakapura Road → NICE Ring Road",
    "Old Madras Road": "Use HAL Airport Road → Varthur Road → Whitefield bypass",
    "Tumkur Road": "Divert via Chord Road → Rajajinagar → Peenya Industrial Area",
    "Bellary Road": "Use Hebbal flyover → ORR → Yelahanka bypass",
    "Outer Ring Road": "Use NICE Ring Road → Kanakapura Road for south; Hebbal flyover for north",
    "Bannerghatta Road": "Divert via Hosur Road → Electronic City flyover",
    "Kanakapura Road": "Use Bannerghatta Road → NICE Road → Mysore Road interchange",
    "Sarjapur Road": "Use ORR → Marathahalli → Whitefield",
    "Whitefield Road": "Divert via ITPL Road → Varthur Road → Sarjapur Road",
}

_DEFAULT_DIVERSION = "Activate alternate parallel corridors; deploy signage at nearest major junction"

# ── Barricade Point Templates ────────────────────────────────────

_BARRICADE_TEMPLATES: Dict[str, List[str]] = {
    "Mysore Road": ["Kengeri Junction", "RR Nagar Junction", "Nayandahalli"],
    "Hosur Road": ["Silk Board Junction", "Madiwala", "Electronic City Toll"],
    "Old Madras Road": ["Indiranagar 100ft Road Junction", "KR Puram Bridge", "Tin Factory"],
    "Bellary Road": ["Hebbal Flyover", "Esteem Mall Junction", "Mekhri Circle"],
    "Outer Ring Road": ["Silk Board", "Marathahalli", "KR Puram", "Hebbal"],
    "Bannerghatta Road": ["Jayadeva Junction", "Arekere Gate", "Meenakshi Temple Road"],
}

_DEFAULT_BARRICADES = ["500m before incident", "Nearest junction upstream", "Nearest junction downstream"]


# ── Cost Model ───────────────────────────────────────────────────

# Estimated cost of traffic delay per hour per lane (INR)
_COST_PER_HOUR_PER_LANE = 25_000  # conservative estimate for Bengaluru corridors

def _estimate_cost(
    duration_hours: float,
    requires_closure: bool,
    impact_score: float,
) -> float:
    """
    Simple economic cost model:
      cost = duration × lanes_affected × cost_per_hour × impact_multiplier
    """
    lanes = 4 if requires_closure else 2
    impact_mult = 1 + (impact_score / 100)  # 1.0 – 2.0
    return round(duration_hours * lanes * _COST_PER_HOUR_PER_LANE * impact_mult, 0)


# ── Playbook Templates ──────────────────────────────────────────

_CAUSE_PLAYBOOKS: Dict[str, List[str]] = {
    "vehicle_breakdown": [
        "1. Dispatch tow truck from nearest depot",
        "2. Place warning cones 200m upstream",
        "3. Open adjacent lane for flow",
        "4. Clear breakdown vehicle within 1h target",
    ],
    "accident": [
        "1. Secure scene — deploy barricades",
        "2. Request ambulance and fire services",
        "3. Document scene (FIR, photos)",
        "4. Begin traffic diversion to alternate route",
        "5. Coordinate with hospitals for casualty update",
        "6. Target scene clearance within 2h",
    ],
    "water_logging": [
        "1. Deploy portable water pumps",
        "2. Barricade flooded road section",
        "3. Activate storm-water drain crew",
        "4. Divert traffic to elevated parallel road",
        "5. Issue public advisory via radio and apps",
    ],
    "tree_fall": [
        "1. Verify no live electrical wires",
        "2. Deploy chainsaw / crane crew",
        "3. Manage traffic around obstruction",
        "4. Notify BBMP and BESCOM if wires affected",
    ],
    "construction": [
        "1. Verify construction permit validity",
        "2. Ensure safety cones, signage in place",
        "3. Assign traffic marshal for lane discipline",
        "4. Request off-peak working hours if impact > 50",
    ],
    "congestion": [
        "1. Deploy additional traffic constables to key signals",
        "2. Override signal timings to favour main corridor",
        "3. Open service roads and one-ways for overflow",
        "4. Issue live congestion advisory",
    ],
    "pot_holes": [
        "1. Place cones around pothole immediately",
        "2. Reduce speed limit to 20 km/h in zone",
        "3. Notify BBMP road repair team",
        "4. Monitor for secondary incidents (tyre bursts)",
    ],
    "public_event": [
        "1. Pre-deploy barricades on event route",
        "2. Station crowd-control officers",
        "3. Set up diversion signage 1 km in advance",
        "4. Coordinate with event organiser for timing",
        "5. Post-event: clear barricades and restore flow",
    ],
}

_DEFAULT_PLAYBOOK = [
    "1. Assess situation and deploy nearest patrol",
    "2. Set up traffic management around the incident",
    "3. Activate diversion if blockage exceeds 30 min",
    "4. Monitor and update status every 15 min",
]


# ── Main Handler ─────────────────────────────────────────────────

@router.post(
    "/recommend",
    response_model=RecommendResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate deployment recommendations",
    description=(
        "Given event details and impact score, returns officer "
        "count, barricade points, diversion route, estimated "
        "resolution time, and economic delay cost."
    ),
)
async def recommend(req: RecommendRequest) -> RecommendResponse:
    impact = req.impact_score
    severity = get_severity_tier(impact)
    cause = req.event_cause.lower().strip()
    corridor = req.corridor.strip()
    closure = req.requires_road_closure
    duration = req.duration_hours or (impact / 5)  # rough fallback

    # ── Officer scaling ──────────────────────────────────────────
    # Base: 2 officers.  Scale by severity and closure.
    base_officers = 2
    severity_mult = {"Low": 1, "Medium": 2, "High": 3, "Critical": 5}
    officers = base_officers * severity_mult.get(severity, 2)
    if closure:
        officers = int(officers * 1.5)

    # Boost from corridor risk
    corridor_risk_df = get_corridor_risk()
    if not corridor_risk_df.empty and corridor in corridor_risk_df["corridor"].values:
        row = corridor_risk_df[corridor_risk_df["corridor"] == corridor].iloc[0]
        risk = row.get("risk_score", 0)
        # Top-tier corridors get extra officers
        if risk > corridor_risk_df["risk_score"].quantile(0.75):
            officers += 4
    officers = max(2, min(officers, 50))  # clamp

    # ── Barricade points ─────────────────────────────────────────
    barricades = _BARRICADE_TEMPLATES.get(corridor, _DEFAULT_BARRICADES)
    if closure:
        barricades = barricades + ["Full corridor closure — block all entry points"]

    # ── Diversion route ──────────────────────────────────────────
    diversion = _DIVERSION_ROUTES.get(corridor, _DEFAULT_DIVERSION)

    # ── Resolution estimate ──────────────────────────────────────
    est_resolution = round(duration * (1 + impact / 200), 1)  # slight scale-up with impact
    est_resolution = max(0.5, est_resolution)

    # ── Cost of delay ────────────────────────────────────────────
    cost = _estimate_cost(est_resolution, closure, impact)

    # ── Playbook ─────────────────────────────────────────────────
    playbook = _CAUSE_PLAYBOOKS.get(cause, _DEFAULT_PLAYBOOK)

    return RecommendResponse(
        officers=officers,
        barricade_points=barricades,
        diversion_route=diversion,
        est_resolution_hrs=est_resolution,
        cost_of_delay=cost,
        playbook=playbook,
        severity=severity,
    )
