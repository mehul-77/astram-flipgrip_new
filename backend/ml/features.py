"""
ml/features.py
───────────────
Feature engineering pipeline for ASTRAM.

Responsibilities
────────────────
1. Parse datetimes and compute `duration_hours` with the fallback chain
   (closed → resolved → end).
2. Extract temporal, categorical, frequency, and risk features.
3. Build a scikit-learn `ColumnTransformer` preprocessor that is fitted
   only on training data to prevent data leakage.
4. Compute the cascade flag (same corridor within 2 hours).

Public API
──────────
- prepare_dataset(csv_path)  → cleaned DataFrame with duration_hours
- build_features(df)         → feature DataFrame ready for modelling
- build_preprocessor(X_train)→ fitted ColumnTransformer (saved later)
- engineer_single(input_dict, preprocessor, corridor_freq, junction_freq,
                  corridor_risk, junction_risk)
                              → numpy array for a single prediction
"""

from __future__ import annotations

import warnings
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import (
    LabelEncoder,
    OneHotEncoder,
    OrdinalEncoder,
    StandardScaler,
)

warnings.filterwarnings("ignore", category=FutureWarning)

# ── Constants ────────────────────────────────────────────────────

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "ASTRAM_event_data.csv"

PEAK_HOURS_MORNING = range(8, 11)   # 08:00 – 10:59
PEAK_HOURS_EVENING = range(17, 21)  # 17:00 – 20:59
NIGHT_START, NIGHT_END = 20, 6      # 20:00 – 05:59

CATEGORICAL_COLS = [
    "event_type",
    "event_cause",
    "corridor",
    "zone",
    "priority",
]

NUMERIC_COLS = [
    "hour",
    "day_of_week",
    "month",
    "week_of_year",
    "is_weekend",
    "is_night",
    "is_peak_hour",
    "requires_road_closure",
    "has_vehicle_info",
    "has_breakdown_reason",
    "corridor_frequency",
    "junction_frequency",
    "corridor_risk_score",
    "junction_risk_score",
    "cascade_flag",
]

FEATURE_COLS = CATEGORICAL_COLS + NUMERIC_COLS


# ── 1.  Load & Compute Duration ─────────────────────────────────

def _parse_dt(series: pd.Series) -> pd.Series:
    """Parse a datetime column, coercing errors to NaT."""
    return pd.to_datetime(series, utc=True, errors="coerce")


def prepare_dataset(csv_path: str | Path | None = None) -> pd.DataFrame:
    """
    Load the raw CSV, compute ``duration_hours`` with fallback logic,
    and drop invalid rows (negative / zero / excessively large durations).

    Returns
    -------
    DataFrame with all original columns + ``duration_hours``.
    """
    path = Path(csv_path) if csv_path else DATA_PATH
    df = pd.read_csv(path)

    # Parse datetime columns
    df["start_datetime"] = _parse_dt(df["start_datetime"])
    df["closed_datetime"] = _parse_dt(df["closed_datetime"])
    df["resolved_datetime"] = _parse_dt(df["resolved_datetime"])
    df["end_datetime"] = _parse_dt(df["end_datetime"])

    # Fallback chain: closed → resolved → end
    end_col = df["closed_datetime"].fillna(df["resolved_datetime"]).fillna(df["end_datetime"])
    df["duration_hours"] = (end_col - df["start_datetime"]).dt.total_seconds() / 3600.0

    # Drop invalid durations
    df = df.dropna(subset=["duration_hours"])
    df = df[df["duration_hours"] > 0]
    df = df[df["duration_hours"] <= 720]  # cap at 30 days

    df = df.reset_index(drop=True)
    return df


# ── 2.  Temporal Features ───────────────────────────────────────

def _add_temporal(df: pd.DataFrame) -> pd.DataFrame:
    """Extract hour, day_of_week, month, week_of_year, binary flags."""
    dt = df["start_datetime"]
    df["hour"] = dt.dt.hour
    df["day_of_week"] = dt.dt.dayofweek          # 0=Mon … 6=Sun
    df["month"] = dt.dt.month
    df["week_of_year"] = dt.dt.isocalendar().week.astype(int)

    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_night"] = (
        (df["hour"] >= NIGHT_START) | (df["hour"] < NIGHT_END)
    ).astype(int)
    df["is_peak_hour"] = (
        df["hour"].isin([*PEAK_HOURS_MORNING, *PEAK_HOURS_EVENING])
    ).astype(int)

    return df


# ── 3.  Binary Presence Flags ───────────────────────────────────

def _add_presence_flags(df: pd.DataFrame) -> pd.DataFrame:
    df["has_vehicle_info"] = df["veh_type"].notna().astype(int)
    df["has_breakdown_reason"] = df["reason_breakdown"].notna().astype(int)
    return df


# ── 4.  Frequency & Risk Features (training-set only) ──────────

def compute_frequency_maps(
    train_df: pd.DataFrame,
) -> Tuple[Dict[str, int], Dict[str, int]]:
    """
    Compute corridor / junction frequencies from training data only.
    """
    corridor_freq = train_df["corridor"].value_counts().to_dict()
    junction_freq = train_df["junction"].value_counts().to_dict()
    return corridor_freq, junction_freq


def compute_risk_maps(
    train_df: pd.DataFrame,
) -> Tuple[Dict[str, float], Dict[str, float]]:
    """
    Compute corridor / junction risk scores from training data only.
    Risk = incident_count × mean_duration
    """
    c_grp = train_df.groupby("corridor")["duration_hours"]
    corridor_risk = (c_grp.count() * c_grp.mean()).to_dict()

    j_grp = train_df.groupby("junction")["duration_hours"]
    junction_risk = (j_grp.count() * j_grp.mean()).to_dict()

    return corridor_risk, junction_risk


def _apply_freq_risk(
    df: pd.DataFrame,
    corridor_freq: Dict[str, int],
    junction_freq: Dict[str, int],
    corridor_risk: Dict[str, float],
    junction_risk: Dict[str, float],
) -> pd.DataFrame:
    """Map precomputed frequency/risk values onto the dataframe."""
    df["corridor_frequency"] = df["corridor"].map(corridor_freq).fillna(0).astype(int)
    df["junction_frequency"] = df["junction"].map(junction_freq).fillna(0).astype(int)
    df["corridor_risk_score"] = df["corridor"].map(corridor_risk).fillna(0.0)
    df["junction_risk_score"] = df["junction"].map(junction_risk).fillna(0.0)
    return df


# ── 5.  Cascade Flag ────────────────────────────────────────────

def _add_cascade_flag(df: pd.DataFrame) -> pd.DataFrame:
    """
    cascade_flag = 1 if another event on the *same corridor* started
    within the previous 2 hours, else 0.
    """
    df = df.sort_values(["corridor", "start_datetime"]).reset_index(drop=True)
    cascade = np.zeros(len(df), dtype=int)

    for corridor, grp in df.groupby("corridor"):
        times = grp["start_datetime"].values
        idxs = grp.index.values
        for i in range(1, len(times)):
            delta_hrs = (times[i] - times[i - 1]) / np.timedelta64(1, "h")
            if 0 < delta_hrs <= 2:
                cascade[idxs[i]] = 1

    df["cascade_flag"] = cascade
    return df


# ── 6.  Fill Missing Categoricals ───────────────────────────────

def _fill_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    df["corridor"] = df["corridor"].fillna("Unknown")
    df["junction"] = df["junction"].fillna("Unknown")
    df["zone"] = df["zone"].fillna("Unknown")
    df["priority"] = df["priority"].fillna("Low")
    df["requires_road_closure"] = df["requires_road_closure"].fillna(False).astype(int)
    return df


# ── 7.  Full Feature Build ──────────────────────────────────────

def build_features(
    df: pd.DataFrame,
    corridor_freq: Dict[str, int] | None = None,
    junction_freq: Dict[str, int] | None = None,
    corridor_risk: Dict[str, float] | None = None,
    junction_risk: Dict[str, float] | None = None,
) -> pd.DataFrame:
    """
    Apply the full feature engineering pipeline.

    If frequency / risk maps are ``None`` they are computed from ``df``
    itself (appropriate only during EDA — never during train/test split).
    """
    df = df.copy()
    df = _fill_categoricals(df)
    df = _add_temporal(df)
    df = _add_presence_flags(df)

    if corridor_freq is None:
        corridor_freq, junction_freq = compute_frequency_maps(df)
    if corridor_risk is None:
        corridor_risk, junction_risk = compute_risk_maps(df)

    df = _apply_freq_risk(df, corridor_freq, junction_freq, corridor_risk, junction_risk)
    df = _add_cascade_flag(df)

    return df


# ── 8.  Preprocessor (ColumnTransformer) ────────────────────────

def build_preprocessor(X_train: pd.DataFrame) -> ColumnTransformer:
    """
    Build and fit a ColumnTransformer on training data.

    - Categorical columns → OneHotEncoder (handle_unknown='ignore')
    - Numeric columns     → StandardScaler
    """
    cat_cols_present = [c for c in CATEGORICAL_COLS if c in X_train.columns]
    num_cols_present = [c for c in NUMERIC_COLS if c in X_train.columns]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                cat_cols_present,
            ),
            ("num", StandardScaler(), num_cols_present),
        ],
        remainder="drop",
    )

    preprocessor.fit(X_train)
    return preprocessor


# ── 9.  Single-Instance Feature Vector ──────────────────────────

def engineer_single(
    input_dict: dict,
    preprocessor: ColumnTransformer,
    corridor_freq: Dict[str, int],
    junction_freq: Dict[str, int],
    corridor_risk: Dict[str, float],
    junction_risk: Dict[str, float],
) -> np.ndarray:
    """
    Convert a single prediction request (dict) into a feature vector
    that matches what the model was trained on.
    """
    from datetime import datetime, timezone

    # Defaults
    corridor = input_dict.get("corridor", "Unknown")
    junction = input_dict.get("junction", "Unknown") or "Unknown"
    zone = input_dict.get("zone", "Unknown") or "Unknown"
    priority = input_dict.get("priority", "High")
    event_type = input_dict.get("event_type", "unplanned")
    event_cause = input_dict.get("event_cause", "others")
    requires_road_closure = int(input_dict.get("requires_road_closure", False))

    now = datetime.now(timezone.utc)
    hour = input_dict.get("hour")
    if hour is None:
        hour = now.hour

    row = {
        "event_type": event_type,
        "event_cause": event_cause,
        "corridor": corridor,
        "zone": zone,
        "priority": priority,
        "hour": hour,
        "day_of_week": now.weekday(),
        "month": now.month,
        "week_of_year": now.isocalendar()[1],
        "is_weekend": int(now.weekday() >= 5),
        "is_night": int(hour >= NIGHT_START or hour < NIGHT_END),
        "is_peak_hour": int(hour in [*PEAK_HOURS_MORNING, *PEAK_HOURS_EVENING]),
        "requires_road_closure": requires_road_closure,
        "has_vehicle_info": int(input_dict.get("veh_type") is not None),
        "has_breakdown_reason": int(input_dict.get("reason_breakdown") is not None),
        "corridor_frequency": corridor_freq.get(corridor, 0),
        "junction_frequency": junction_freq.get(junction, 0),
        "corridor_risk_score": corridor_risk.get(corridor, 0.0),
        "junction_risk_score": junction_risk.get(junction, 0.0),
        "cascade_flag": 0,  # Cannot know at prediction time; default 0
    }

    df_single = pd.DataFrame([row])
    return preprocessor.transform(df_single)
