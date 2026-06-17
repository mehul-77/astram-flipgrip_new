"""
ml/shap_engine.py
─────────────────
SHAP-based feature explainability for individual predictions.

Uses TreeExplainer for tree-based models (RF, XGBoost, LightGBM)
to compute per-instance feature contributions.

Public API
──────────
- explain(model, preprocessor, X_single) → list[dict]
  Returns top 5 features with their absolute SHAP contributions.
"""

from __future__ import annotations

import warnings
from typing import List, Dict

import numpy as np
import shap

warnings.filterwarnings("ignore")


def _get_feature_names(preprocessor) -> list[str]:
    """Extract human-readable feature names from the fitted ColumnTransformer."""
    names: list[str] = []
    for name, transformer, columns in preprocessor.transformers_:
        if name == "remainder":
            continue
        if hasattr(transformer, "get_feature_names_out"):
            out = transformer.get_feature_names_out(columns)
            names.extend(out)
        else:
            names.extend(columns)
    return names


def _simplify_name(raw: str) -> str:
    """
    Convert OneHotEncoder names like 'cat__event_cause_water_logging'
    into readable 'event_cause: water_logging'.
    """
    # Strip transformer prefix (e.g. cat__, num__)
    for prefix in ("cat__", "num__"):
        if raw.startswith(prefix):
            raw = raw[len(prefix):]
            break

    # Split on first underscore that separates column from category
    # e.g. event_cause_water_logging → event_cause: water_logging
    known_prefixes = [
        "event_type",
        "event_cause",
        "corridor",
        "zone",
        "priority",
    ]
    for pref in known_prefixes:
        if raw.startswith(pref + "_"):
            category = raw[len(pref) + 1:]
            return f"{pref}: {category}"

    return raw


def explain(
    model,
    preprocessor,
    X_single: np.ndarray,
    top_k: int = 5,
) -> List[Dict[str, float]]:
    """
    Compute SHAP values for a single transformed instance.

    Parameters
    ----------
    model : fitted tree-based model (RF / XGB / LGBM)
    preprocessor : fitted ColumnTransformer
    X_single : numpy array of shape (1, n_features) — already transformed
    top_k : number of top features to return

    Returns
    -------
    List of dicts: [{"feature": "corridor: Mysore Road", "contribution": 18.4}, ...]
    Contributions are absolute SHAP values normalised to sum to 100.
    """
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_single)
    except Exception:
        # Fallback: KernelExplainer with a sample background
        # This path is slow but works with any model type.
        explainer = shap.KernelExplainer(model.predict, X_single)
        shap_values = explainer.shap_values(X_single)

    # shap_values shape: (1, n_features)
    if isinstance(shap_values, list):
        shap_values = shap_values[0]

    abs_vals = np.abs(shap_values).flatten()

    feature_names = _get_feature_names(preprocessor)

    # Ensure lengths match (can differ if remainder columns exist)
    n = min(len(feature_names), len(abs_vals))
    abs_vals = abs_vals[:n]
    feature_names = feature_names[:n]

    # Normalise to percentage
    total = abs_vals.sum()
    if total == 0:
        total = 1.0  # avoid division by zero

    contributions = (abs_vals / total) * 100.0

    # Sort and take top-k
    top_indices = np.argsort(contributions)[::-1][:top_k]

    result = []
    for idx in top_indices:
        result.append({
            "feature": _simplify_name(feature_names[idx]),
            "contribution": round(float(contributions[idx]), 1),
        })

    return result
