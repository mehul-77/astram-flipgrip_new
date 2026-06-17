"""
utils/loader.py
───────────────
Singleton resource loader for the ASTRAM API.

Lazily loads and caches:
- ML model (best_model.pkl)
- Preprocessor (preprocessor.pkl)
- Feature maps (feature_maps.pkl) — corridor/junction freq & risk
- EventDNAEngine (built from prepared dataset)
- Analytics CSVs (corridor_risk, junction_risk, hourly, monthly, cascade)
- Model metrics (model_metrics.json)

All resources are loaded once on first access and reused across
requests for the lifetime of the process.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import pandas as pd

logger = logging.getLogger("astram.loader")

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "models"
DATA_DIR = ROOT / "data"
OUTPUTS_DIR = ROOT / "outputs"

# ── Singleton cache ──────────────────────────────────────────────

_cache: Dict[str, Any] = {}


def _get_or_load(key: str, loader):
    """Generic memoized loader."""
    if key not in _cache:
        logger.info("Loading %s …", key)
        _cache[key] = loader()
    return _cache[key]


# ── Model & Preprocessor ────────────────────────────────────────

def get_model():
    return _get_or_load("model", lambda: joblib.load(MODELS_DIR / "best_model.pkl"))


def get_preprocessor():
    return _get_or_load("preprocessor", lambda: joblib.load(MODELS_DIR / "preprocessor.pkl"))


def get_feature_maps() -> dict:
    return _get_or_load("feature_maps", lambda: joblib.load(MODELS_DIR / "feature_maps.pkl"))


def get_metrics() -> dict:
    def _load():
        path = MODELS_DIR / "model_metrics.json"
        if path.exists():
            with open(path) as f:
                return json.load(f)
        return {}
    return _get_or_load("metrics", _load)


# ── Event DNA Engine ────────────────────────────────────────────

def get_dna_engine():
    def _build():
        from ml.features import prepare_dataset
        from ml.knn_dna import EventDNAEngine

        df = prepare_dataset()
        return EventDNAEngine(df)

    return _get_or_load("dna_engine", _build)


# ── Analytics CSVs ───────────────────────────────────────────────

def _load_csv(name: str) -> pd.DataFrame:
    path = OUTPUTS_DIR / name
    if path.exists():
        return pd.read_csv(path)
    logger.warning("Analytics CSV not found: %s", path)
    return pd.DataFrame()


def get_corridor_risk() -> pd.DataFrame:
    return _get_or_load("corridor_risk", lambda: _load_csv("corridor_risk.csv"))


def get_junction_risk() -> pd.DataFrame:
    return _get_or_load("junction_risk", lambda: _load_csv("junction_risk.csv"))


def get_hourly_distribution() -> pd.DataFrame:
    return _get_or_load("hourly_dist", lambda: _load_csv("hourly_distribution.csv"))


def get_monthly_trend() -> pd.DataFrame:
    return _get_or_load("monthly_trend", lambda: _load_csv("monthly_trend.csv"))


def get_cascade_stats() -> pd.DataFrame:
    return _get_or_load("cascade_stats", lambda: _load_csv("cascade_stats.csv"))


# ── Preload (called at startup) ─────────────────────────────────

def preload() -> bool:
    """
    Attempt to preload all resources. Returns True if the model was
    loaded successfully, False otherwise (e.g. model not yet trained).
    """
    try:
        get_model()
        get_preprocessor()
        get_feature_maps()
        get_metrics()
        get_dna_engine()
        # Analytics CSVs (optional — may not exist before EDA runs)
        get_corridor_risk()
        get_junction_risk()
        get_hourly_distribution()
        get_monthly_trend()
        get_cascade_stats()
        logger.info("All resources preloaded successfully.")
        return True
    except FileNotFoundError as e:
        logger.warning("Preload incomplete — %s. Train the model first.", e)
        return False
    except Exception as e:
        logger.error("Preload error: %s", e)
        return False


def is_model_loaded() -> bool:
    """Check whether the model is currently loaded in cache."""
    return "model" in _cache
