"""
utils/scoring.py
────────────────
Impact score calculation and severity classification.

Impact Score Formula
────────────────────
  impact = (min(duration_hours, 48) / 48) * 50
         + requires_road_closure * 25
         + priority_high * 15
         + planned_event * 10

Clamped to [0, 100].

Severity Tiers
──────────────
  0–25   → Low
  26–50  → Medium
  51–75  → High
  76–100 → Critical
"""

from __future__ import annotations


def compute_impact_score(
    duration_hours: float,
    requires_road_closure: bool = False,
    priority: str = "Low",
    event_type: str = "unplanned",
) -> float:
    """
    Compute a composite impact score between 0 and 100.

    Parameters
    ----------
    duration_hours : predicted or actual disruption duration
    requires_road_closure : whether the event requires closing the road
    priority : 'High' or 'Low'
    event_type : 'planned' or 'unplanned'

    Returns
    -------
    float — impact score clamped to [0, 100]
    """
    duration_component = (min(duration_hours, 48) / 48) * 50
    closure_component = 25.0 if requires_road_closure else 0.0
    priority_component = 15.0 if str(priority).strip().lower() == "high" else 0.0
    planned_component = 10.0 if str(event_type).strip().lower() == "planned" else 0.0

    score = duration_component + closure_component + priority_component + planned_component
    return round(max(0.0, min(100.0, score)), 2)


def get_severity_tier(impact_score: float) -> str:
    """
    Map an impact score to a human-readable severity tier.

    Returns
    -------
    str — one of 'Low', 'Medium', 'High', 'Critical'
    """
    if impact_score <= 25:
        return "Low"
    elif impact_score <= 50:
        return "Medium"
    elif impact_score <= 75:
        return "High"
    else:
        return "Critical"
