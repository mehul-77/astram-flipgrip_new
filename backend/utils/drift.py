"""
utils/drift.py
──────────────
Prediction drift monitoring.

Tracks per-event-cause prediction errors and flags drift when the
average relative error exceeds 30%.

Storage
───────
In-memory list with JSON persistence to ``data/feedback_log.json``
so drift history survives restarts.

Public API
──────────
- log_feedback(event_id, predicted, actual, cause) → dict
- get_drift_summary() → dict
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Dict, List, Optional

ROOT = Path(__file__).resolve().parent.parent
FEEDBACK_FILE = ROOT / "data" / "feedback_log.json"
DRIFT_THRESHOLD = 30.0  # percent

_lock = threading.Lock()
_feedback_log: List[dict] = []


def _load() -> None:
    """Load persisted feedback from disk (called once at import)."""
    global _feedback_log
    if FEEDBACK_FILE.exists():
        try:
            with open(FEEDBACK_FILE, "r") as f:
                _feedback_log = json.load(f)
        except (json.JSONDecodeError, IOError):
            _feedback_log = []


def _save() -> None:
    """Persist current feedback log to disk."""
    FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(FEEDBACK_FILE, "w") as f:
        json.dump(_feedback_log, f, indent=2)


# Load on module import
_load()


def log_feedback(
    event_id: str,
    predicted_hrs: float,
    actual_hrs: float,
    event_cause: str,
) -> dict:
    """
    Log a single feedback entry and return drift status.

    Returns
    -------
    dict with keys: logged, drift_pct, status, category_drift
    """
    # Compute relative error
    if predicted_hrs > 0:
        error_pct = abs(actual_hrs - predicted_hrs) / predicted_hrs * 100
    else:
        error_pct = 100.0 if actual_hrs > 0 else 0.0

    entry = {
        "event_id": event_id,
        "predicted_hrs": predicted_hrs,
        "actual_hrs": actual_hrs,
        "event_cause": event_cause,
        "error_pct": round(error_pct, 2),
    }

    with _lock:
        _feedback_log.append(entry)
        _save()

    # Compute overall and per-category drift
    category_drift = _compute_category_drift()
    overall_drift = _compute_overall_drift()
    status = "DRIFTING" if overall_drift > DRIFT_THRESHOLD else "STABLE"

    return {
        "logged": True,
        "drift_pct": round(overall_drift, 2),
        "status": status,
        "category_drift": category_drift,
    }


def _compute_overall_drift() -> float:
    """Average error across all feedback entries."""
    with _lock:
        if not _feedback_log:
            return 0.0
        return sum(e["error_pct"] for e in _feedback_log) / len(_feedback_log)


def _compute_category_drift() -> Dict[str, float]:
    """Average error per event_cause category."""
    with _lock:
        buckets: Dict[str, List[float]] = {}
        for e in _feedback_log:
            cause = e["event_cause"]
            buckets.setdefault(cause, []).append(e["error_pct"])

    return {
        cause: round(sum(errs) / len(errs), 2)
        for cause, errs in buckets.items()
    }


def get_drift_summary() -> dict:
    """
    Return the current drift state without logging new feedback.
    """
    overall = _compute_overall_drift()
    category = _compute_category_drift()
    return {
        "overall_drift_pct": round(overall, 2),
        "status": "DRIFTING" if overall > DRIFT_THRESHOLD else "STABLE",
        "category_drift": category,
        "total_feedback_entries": len(_feedback_log),
    }
