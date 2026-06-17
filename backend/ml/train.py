"""
ml/train.py
───────────
End-to-end model training pipeline for ASTRAM.

Run:
    python -m ml.train

What it does
────────────
1. Load & prepare data  (features.py)
2. Train/test split (80/20, stratified by priority where possible)
3. Compute frequency/risk maps from TRAINING set only
4. Build features for train and test
5. Fit preprocessor on training features only
6. Train RandomForest, XGBoost, LightGBM
7. Evaluate MAE, RMSE, R²
8. Select best model automatically
9. Save:
   - models/best_model.pkl
   - models/preprocessor.pkl
   - models/model_metrics.json
   - models/feature_maps.pkl  (corridor/junction freq & risk maps)
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)


def train() -> None:
    # ── lazy imports so file can be introspected without ML libs ──
    from xgboost import XGBRegressor
    from lightgbm import LGBMRegressor

    from ml.features import (
        FEATURE_COLS,
        build_features,
        build_preprocessor,
        compute_frequency_maps,
        compute_risk_maps,
        prepare_dataset,
    )

    print("=" * 65)
    print("  ASTRAM — Model Training Pipeline")
    print("=" * 65)

    # ── 1. Load ──────────────────────────────────────────────────
    print("\n[1/7] Loading & preparing dataset …")
    df = prepare_dataset()
    print(f"  Records with valid duration: {len(df)}")

    # ── 2. Train/test split ──────────────────────────────────────
    print("[2/7] Splitting into train/test (80/20) …")
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)
    print(f"  Train: {len(train_df)}  |  Test: {len(test_df)}")

    # ── 3. Frequency & risk maps (TRAIN only) ───────────────────
    print("[3/7] Computing frequency & risk maps from training set …")
    corridor_freq, junction_freq = compute_frequency_maps(train_df)
    corridor_risk, junction_risk = compute_risk_maps(train_df)

    feature_maps = {
        "corridor_freq": corridor_freq,
        "junction_freq": junction_freq,
        "corridor_risk": corridor_risk,
        "junction_risk": junction_risk,
    }

    # ── 4. Build features ────────────────────────────────────────
    print("[4/7] Building features …")
    train_feat = build_features(
        train_df, corridor_freq, junction_freq, corridor_risk, junction_risk
    )
    test_feat = build_features(
        test_df, corridor_freq, junction_freq, corridor_risk, junction_risk
    )

    y_train = train_feat["duration_hours"].values
    y_test = test_feat["duration_hours"].values

    X_train_raw = train_feat[FEATURE_COLS]
    X_test_raw = test_feat[FEATURE_COLS]

    # ── 5. Preprocessor (fit on train) ───────────────────────────
    print("[5/7] Fitting preprocessor …")
    preprocessor = build_preprocessor(X_train_raw)
    X_train = preprocessor.transform(X_train_raw)
    X_test = preprocessor.transform(X_test_raw)
    print(f"  Feature matrix shape: {X_train.shape}")

    # ── 6. Train models ──────────────────────────────────────────
    print("[6/7] Training models …\n")

    models = {
        "RandomForest": RandomForestRegressor(
            n_estimators=300,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=3,
            n_jobs=-1,
            random_state=42,
        ),
        "XGBoost": XGBRegressor(
            n_estimators=300,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            n_jobs=-1,
            random_state=42,
            verbosity=0,
        ),
        "LightGBM": LGBMRegressor(
            n_estimators=300,
            max_depth=10,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            n_jobs=-1,
            random_state=42,
            verbose=-1,
        ),
    }

    results: dict[str, dict] = {}

    for name, model in models.items():
        print(f"  Training {name} …", end=" ")
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        r2 = r2_score(y_test, preds)

        results[name] = {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
            "model": model,
        }
        print(f"MAE={mae:.4f}  RMSE={rmse:.4f}  R²={r2:.4f}")

    # ── 7. Select best & save ────────────────────────────────────
    print("\n[7/7] Selecting best model & saving …")

    # Primary: lowest MAE
    best_name = min(results, key=lambda k: results[k]["mae"])
    best = results[best_name]
    print(f"\n  ★ Best model: {best_name}")
    print(f"    MAE  = {best['mae']}")
    print(f"    RMSE = {best['rmse']}")
    print(f"    R²   = {best['r2']}")

    # Save model
    joblib.dump(best["model"], MODELS_DIR / "best_model.pkl")
    print(f"  → models/best_model.pkl")

    # Save preprocessor
    joblib.dump(preprocessor, MODELS_DIR / "preprocessor.pkl")
    print(f"  → models/preprocessor.pkl")

    # Save feature maps
    joblib.dump(feature_maps, MODELS_DIR / "feature_maps.pkl")
    print(f"  → models/feature_maps.pkl")

    # Save metrics
    metrics = {
        "best_model": best_name,
        "comparison": {
            name: {k: v for k, v in vals.items() if k != "model"}
            for name, vals in results.items()
        },
        "train_size": len(train_df),
        "test_size": len(test_df),
        "feature_count": X_train.shape[1],
    }
    with open(MODELS_DIR / "model_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  → models/model_metrics.json")

    # ── Comparison table ─────────────────────────────────────────
    print("\n" + "─" * 50)
    print(f"  {'Model':<16} {'MAE':>8} {'RMSE':>8} {'R²':>8}")
    print("─" * 50)
    for name, vals in results.items():
        marker = " ★" if name == best_name else ""
        print(f"  {name:<16} {vals['mae']:>8.4f} {vals['rmse']:>8.4f} {vals['r2']:>8.4f}{marker}")
    print("─" * 50)

    print("\n  Training complete ✓\n")


if __name__ == "__main__":
    train()
