"""
eda.py
──────
Exploratory Data Analysis for ASTRAM event data.

Run:
    python eda.py

Outputs (all in outputs/):
    ── CSVs for analytics APIs ──
    corridor_risk.csv
    junction_risk.csv
    hourly_distribution.csv
    monthly_trend.csv
    cascade_stats.csv

    ── PNG visualisations ──
    01_missing_values.png
    02_duration_distribution.png
    03_corridor_frequency.png
    04_junction_frequency.png
    05_zone_analysis.png
    06_event_cause.png
    07_priority_analysis.png
    08_closure_analysis.png
    09_hourly_trend.png
    10_monthly_trend.png
    11_top20_corridors.png
    12_top20_junctions.png
    13_cascade_events.png
    14_correlation_matrix.png
"""

from __future__ import annotations

import warnings
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

warnings.filterwarnings("ignore")

# ── Paths ────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "ASTRAM_event_data.csv"
OUT = ROOT / "outputs"
OUT.mkdir(exist_ok=True)

# ── Style ────────────────────────────────────────────────────────

sns.set_theme(style="whitegrid", palette="viridis", font_scale=1.1)
FIGSIZE = (14, 6)


# ── Helpers ──────────────────────────────────────────────────────

def save(fig, name: str) -> None:
    fig.tight_layout()
    fig.savefig(OUT / name, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✓ {name}")


def _parse_dt(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, utc=True, errors="coerce")


# ── Load ─────────────────────────────────────────────────────────

def load() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    df["start_datetime"] = _parse_dt(df["start_datetime"])
    df["closed_datetime"] = _parse_dt(df["closed_datetime"])
    df["resolved_datetime"] = _parse_dt(df["resolved_datetime"])
    df["end_datetime"] = _parse_dt(df["end_datetime"])

    end_col = (
        df["closed_datetime"]
        .fillna(df["resolved_datetime"])
        .fillna(df["end_datetime"])
    )
    df["duration_hours"] = (end_col - df["start_datetime"]).dt.total_seconds() / 3600.0
    return df


# ── 1. Missing Values ───────────────────────────────────────────

def missing_values(df: pd.DataFrame) -> None:
    print("\n── 1. Missing Value Analysis ──")
    missing = df.isnull().sum()
    missing_pct = (missing / len(df) * 100).round(1)
    summary = pd.DataFrame({"missing": missing, "pct": missing_pct})
    summary = summary[summary["missing"] > 0].sort_values("pct", ascending=False)
    print(summary.head(20))

    fig, ax = plt.subplots(figsize=FIGSIZE)
    top = summary.head(20)
    bars = ax.barh(top.index, top["pct"], color=sns.color_palette("magma", len(top)))
    ax.set_xlabel("Missing %")
    ax.set_title("Top 20 Columns by Missing Data %")
    ax.invert_yaxis()
    for bar, pct in zip(bars, top["pct"]):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height() / 2,
                f"{pct}%", va="center", fontsize=9)
    save(fig, "01_missing_values.png")


# ── 2. Duplicates ────────────────────────────────────────────────

def duplicate_analysis(df: pd.DataFrame) -> None:
    print("\n── 2. Duplicate Analysis ──")
    dups = df.duplicated().sum()
    print(f"  Exact duplicates: {dups}")
    id_dups = df["id"].duplicated().sum()
    print(f"  Duplicate IDs:    {id_dups}")


# ── 3. Duration Distribution ────────────────────────────────────

def duration_distribution(df: pd.DataFrame) -> None:
    print("\n── 3. Duration Distribution ──")
    valid = df["duration_hours"].dropna()
    valid = valid[(valid > 0) & (valid <= 720)]
    print(f"  Valid durations: {len(valid)}")
    print(valid.describe().round(2))

    fig, axes = plt.subplots(1, 2, figsize=FIGSIZE)

    axes[0].hist(valid.clip(upper=100), bins=60, color="#6C5CE7", edgecolor="white")
    axes[0].set_title("Duration Distribution (clipped at 100h)")
    axes[0].set_xlabel("Hours")
    axes[0].set_ylabel("Count")

    axes[1].boxplot(valid.clip(upper=200), vert=True, patch_artist=True,
                    boxprops=dict(facecolor="#00B894"))
    axes[1].set_title("Duration Box Plot (clipped at 200h)")
    axes[1].set_ylabel("Hours")

    save(fig, "02_duration_distribution.png")


# ── 4. Corridor Frequency ───────────────────────────────────────

def corridor_frequency(df: pd.DataFrame) -> None:
    print("\n── 4. Corridor Frequency ──")
    counts = df["corridor"].value_counts().head(20)
    print(counts)

    fig, ax = plt.subplots(figsize=FIGSIZE)
    counts.plot.barh(ax=ax, color=sns.color_palette("rocket", len(counts)))
    ax.set_xlabel("Event Count")
    ax.set_title("Top 20 Corridors by Event Count")
    ax.invert_yaxis()
    save(fig, "03_corridor_frequency.png")


# ── 5. Junction Frequency ───────────────────────────────────────

def junction_frequency(df: pd.DataFrame) -> None:
    print("\n── 5. Junction Frequency ──")
    counts = df["junction"].value_counts().head(20)
    print(counts)

    fig, ax = plt.subplots(figsize=FIGSIZE)
    counts.plot.barh(ax=ax, color=sns.color_palette("mako", len(counts)))
    ax.set_xlabel("Event Count")
    ax.set_title("Top 20 Junctions by Event Count")
    ax.invert_yaxis()
    save(fig, "04_junction_frequency.png")


# ── 6. Zone Analysis ────────────────────────────────────────────

def zone_analysis(df: pd.DataFrame) -> None:
    print("\n── 6. Zone Analysis ──")
    counts = df["zone"].value_counts()
    print(counts)

    fig, ax = plt.subplots(figsize=(10, 6))
    counts.plot.pie(ax=ax, autopct="%1.1f%%", startangle=140,
                    colors=sns.color_palette("Set2", len(counts)))
    ax.set_ylabel("")
    ax.set_title("Event Distribution by Zone")
    save(fig, "05_zone_analysis.png")


# ── 7. Event Cause ──────────────────────────────────────────────

def event_cause_analysis(df: pd.DataFrame) -> None:
    print("\n── 7. Event Cause Analysis ──")
    counts = df["event_cause"].value_counts()
    print(counts)

    fig, ax = plt.subplots(figsize=FIGSIZE)
    counts.plot.bar(ax=ax, color=sns.color_palette("flare", len(counts)))
    ax.set_ylabel("Count")
    ax.set_title("Event Cause Distribution")
    ax.tick_params(axis="x", rotation=45)
    save(fig, "06_event_cause.png")


# ── 8. Priority Analysis ────────────────────────────────────────

def priority_analysis(df: pd.DataFrame) -> None:
    print("\n── 8. Priority Analysis ──")
    counts = df["priority"].value_counts()
    print(counts)

    valid = df.dropna(subset=["duration_hours"])
    valid = valid[valid["duration_hours"] > 0]

    fig, axes = plt.subplots(1, 2, figsize=FIGSIZE)
    counts.plot.pie(ax=axes[0], autopct="%1.1f%%",
                    colors=["#E17055", "#00CEC9"], startangle=90)
    axes[0].set_ylabel("")
    axes[0].set_title("Priority Distribution")

    if len(valid) > 0:
        valid.boxplot(column="duration_hours", by="priority", ax=axes[1],
                      patch_artist=True)
        axes[1].set_title("Duration by Priority")
        axes[1].set_ylabel("Hours")
        axes[1].set_xlabel("")
        plt.suptitle("")

    save(fig, "07_priority_analysis.png")


# ── 9. Closure Analysis ─────────────────────────────────────────

def closure_analysis(df: pd.DataFrame) -> None:
    print("\n── 9. Closure Analysis ──")
    counts = df["requires_road_closure"].value_counts()
    print(counts)

    fig, ax = plt.subplots(figsize=(8, 5))
    counts.plot.bar(ax=ax, color=["#00B894", "#D63031"])
    ax.set_title("Road Closure Required")
    ax.set_ylabel("Count")
    ax.set_xticklabels(["No", "Yes"], rotation=0)
    save(fig, "08_closure_analysis.png")


# ── 10. Hourly Trend ────────────────────────────────────────────

def hourly_trend(df: pd.DataFrame) -> None:
    print("\n── 10. Hourly Trend ──")
    df_h = df.dropna(subset=["start_datetime"]).copy()
    df_h["hour"] = df_h["start_datetime"].dt.hour
    df_h = df_h.dropna(subset=["hour"])
    df_h["hour"] = df_h["hour"].astype(int)
    counts = df_h["hour"].value_counts().sort_index()

    hourly_df = pd.DataFrame({"hour": counts.index, "incident_count": counts.values})
    hourly_df.to_csv(OUT / "hourly_distribution.csv", index=False)
    print(f"  Exported hourly_distribution.csv ({len(hourly_df)} rows)")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.fill_between(counts.index, counts.values, alpha=0.3, color="#6C5CE7")
    ax.plot(counts.index, counts.values, marker="o", color="#6C5CE7", linewidth=2)
    ax.set_xlabel("Hour of Day")
    ax.set_ylabel("Incident Count")
    ax.set_title("Incident Distribution by Hour")
    ax.set_xticks(range(24))
    save(fig, "09_hourly_trend.png")


# ── 11. Monthly Trend ───────────────────────────────────────────

def monthly_trend(df: pd.DataFrame) -> None:
    print("\n── 11. Monthly Trend ──")
    df_m = df.dropna(subset=["start_datetime"]).copy()
    df_m["month"] = df_m["start_datetime"].dt.month
    df_m = df_m.dropna(subset=["month"])
    df_m["month"] = df_m["month"].astype(int)
    counts = df_m["month"].value_counts().sort_index()

    monthly_df = pd.DataFrame({"month": counts.index.tolist(), "incident_count": counts.values.tolist()})
    monthly_df.to_csv(OUT / "monthly_trend.csv", index=False)
    print(f"  Exported monthly_trend.csv ({len(monthly_df)} rows)")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    labels = [month_names[int(m) - 1] for m in counts.index]
    ax.bar(labels, counts.values, color=sns.color_palette("coolwarm", len(counts)))
    ax.set_xlabel("Month")
    ax.set_ylabel("Incident Count")
    ax.set_title("Monthly Incident Trend")
    save(fig, "10_monthly_trend.png")


# ── 12. Top 20 Risk Corridors ───────────────────────────────────

def top_corridors(df: pd.DataFrame) -> None:
    print("\n── 12. Top 20 Risk Corridors ──")
    valid = df.dropna(subset=["duration_hours", "corridor"])
    valid = valid[valid["duration_hours"] > 0]

    grp = valid.groupby("corridor")["duration_hours"]
    risk = pd.DataFrame({
        "corridor": grp.count().index,
        "incident_count": grp.count().values,
        "avg_duration": grp.mean().values.round(2),
        "risk_score": (grp.count().values * grp.mean().values).round(2),
    }).sort_values("risk_score", ascending=False)

    risk.to_csv(OUT / "corridor_risk.csv", index=False)
    print(f"  Exported corridor_risk.csv ({len(risk)} rows)")

    top = risk.head(20)
    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.barh(top["corridor"], top["risk_score"],
            color=sns.color_palette("YlOrRd_r", len(top)))
    ax.set_xlabel("Risk Score (count × avg duration)")
    ax.set_title("Top 20 Risk Corridors")
    ax.invert_yaxis()
    save(fig, "11_top20_corridors.png")


# ── 13. Top 20 Risk Junctions ───────────────────────────────────

def top_junctions(df: pd.DataFrame) -> None:
    print("\n── 13. Top 20 Risk Junctions ──")
    valid = df.dropna(subset=["duration_hours", "junction"])
    valid = valid[valid["duration_hours"] > 0]

    grp = valid.groupby("junction")["duration_hours"]
    risk = pd.DataFrame({
        "junction": grp.count().index,
        "incident_count": grp.count().values,
        "avg_duration": grp.mean().values.round(2),
        "risk_score": (grp.count().values * grp.mean().values).round(2),
    }).sort_values("risk_score", ascending=False)

    risk.to_csv(OUT / "junction_risk.csv", index=False)
    print(f"  Exported junction_risk.csv ({len(risk)} rows)")

    top = risk.head(20)
    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.barh(top["junction"], top["risk_score"],
            color=sns.color_palette("PuBuGn_r", len(top)))
    ax.set_xlabel("Risk Score (count × avg duration)")
    ax.set_title("Top 20 Risk Junctions")
    ax.invert_yaxis()
    save(fig, "12_top20_junctions.png")


# ── 14. Cascade Events ──────────────────────────────────────────

def cascade_analysis(df: pd.DataFrame) -> None:
    print("\n── 14. Cascade Event Analysis ──")
    valid = df.dropna(subset=["duration_hours", "corridor"]).copy()
    valid = valid[valid["duration_hours"] > 0]
    valid = valid.sort_values(["corridor", "start_datetime"]).reset_index(drop=True)

    cascade_flags = np.zeros(len(valid), dtype=int)
    for corridor, grp in valid.groupby("corridor"):
        times = grp["start_datetime"].values
        idxs = grp.index.values
        for i in range(1, len(times)):
            delta_hrs = (times[i] - times[i - 1]) / np.timedelta64(1, "h")
            if 0 < delta_hrs <= 2:
                cascade_flags[idxs[i]] = 1

    valid["cascade_flag"] = cascade_flags
    cascade_df = valid[valid["cascade_flag"] == 1]

    stats = cascade_df.groupby("corridor")["duration_hours"].agg(
        cascade_count="count", avg_duration="mean"
    ).round(2).sort_values("cascade_count", ascending=False).reset_index()

    stats.to_csv(OUT / "cascade_stats.csv", index=False)
    print(f"  Exported cascade_stats.csv ({len(stats)} rows)")
    print(f"  Total cascade events: {cascade_flags.sum()}")

    top = stats.head(15)
    if len(top) > 0:
        fig, ax = plt.subplots(figsize=FIGSIZE)
        ax.bar(top["corridor"], top["cascade_count"],
               color=sns.color_palette("Reds_r", len(top)))
        ax.set_ylabel("Cascade Count")
        ax.set_title("Cascade Events by Corridor (same corridor within 2h)")
        ax.tick_params(axis="x", rotation=45)
        save(fig, "13_cascade_events.png")


# ── 15. Correlation Matrix ───────────────────────────────────────

def correlation_analysis(df: pd.DataFrame) -> None:
    print("\n── 15. Correlation Analysis ──")
    numeric = df.select_dtypes(include=[np.number])
    # Keep only columns with variance
    numeric = numeric.loc[:, numeric.std() > 0]
    corr = numeric.corr()

    fig, ax = plt.subplots(figsize=(12, 10))
    mask = np.triu(np.ones_like(corr, dtype=bool))
    sns.heatmap(corr, mask=mask, annot=False, cmap="RdBu_r", center=0,
                linewidths=0.5, ax=ax)
    ax.set_title("Feature Correlation Matrix")
    save(fig, "14_correlation_matrix.png")


# ── Main ─────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 60)
    print("  ASTRAM — Exploratory Data Analysis")
    print("=" * 60)

    df = load()
    print(f"\nDataset: {len(df)} rows × {len(df.columns)} columns")

    missing_values(df)
    duplicate_analysis(df)
    duration_distribution(df)
    corridor_frequency(df)
    junction_frequency(df)
    zone_analysis(df)
    event_cause_analysis(df)
    priority_analysis(df)
    closure_analysis(df)
    hourly_trend(df)
    monthly_trend(df)
    top_corridors(df)
    top_junctions(df)
    cascade_analysis(df)
    correlation_analysis(df)

    print("\n" + "=" * 60)
    print("  EDA complete. All outputs saved to outputs/")
    print("=" * 60)


if __name__ == "__main__":
    main()
