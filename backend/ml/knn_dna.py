"""
ml/knn_dna.py
─────────────
Event DNA Engine — K-Nearest Neighbor similar-incident matching.

Encodes each historical event into a feature vector and uses
scikit-learn's NearestNeighbors to find the most similar past
incidents for a given query event.

Public API
──────────
- EventDNAEngine(df)           — build the index from a prepared DataFrame
- engine.find_similar(query, k) — return top-k similar events
"""

from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import LabelEncoder, StandardScaler


# ── Playbook Templates ───────────────────────────────────────────

_PLAYBOOKS: Dict[str, List[str]] = {
    "vehicle_breakdown": [
        "Deploy tow truck to site",
        "Set up warning signs 200m before incident",
        "Divert traffic to alternate lane",
        "Notify nearest patrol unit",
    ],
    "accident": [
        "Dispatch emergency medical services",
        "Secure accident zone with barricades",
        "Document scene and collect evidence",
        "Coordinate with hospital for casualties",
        "Open alternate route for through-traffic",
    ],
    "water_logging": [
        "Deploy water pumps and drainage team",
        "Place barricades at flooded sections",
        "Divert traffic via elevated corridors",
        "Issue public advisory via traffic apps",
    ],
    "tree_fall": [
        "Dispatch tree removal crew",
        "Set up barricades around fallen tree",
        "Manage single-lane traffic if partial block",
        "Notify BBMP for permanent clearance",
    ],
    "construction": [
        "Verify construction permit and schedule",
        "Ensure contractor has placed safety cones",
        "Assign traffic marshal for lane management",
        "Coordinate off-peak work hours if possible",
    ],
    "pot_holes": [
        "Place warning cones around pothole",
        "Report to BBMP for immediate repair",
        "Slow traffic through affected zone",
        "Monitor for vehicle damage incidents",
    ],
    "congestion": [
        "Deploy additional traffic officers to key junctions",
        "Activate adaptive signal timing",
        "Open service roads for overflow",
        "Issue advisory on traffic apps",
    ],
    "public_event": [
        "Pre-position barricades on event route",
        "Deploy crowd-control officers",
        "Set up diversion signage 1 km before venue",
        "Coordinate with event organiser on schedule",
    ],
    "road_conditions": [
        "Place warning signs and reduce speed limit",
        "Report to road maintenance authority",
        "Deploy patrol for driver advisories",
    ],
    "procession": [
        "Escort with patrol vehicles",
        "Pre-clear route and hold cross-traffic",
        "Deploy officers at major intersections",
        "Coordinate expected duration with organisers",
    ],
    "vip_movement": [
        "Implement VIP security protocol",
        "Clear and hold route segments",
        "Deploy officers at all intersections on route",
        "Coordinate with SPG/security detail",
    ],
    "protest": [
        "Deploy crowd-control unit",
        "Set up perimeter barricades",
        "Establish communication with protest leaders",
        "Prepare alternate routes for diverted traffic",
    ],
}

_DEFAULT_PLAYBOOK = [
    "Assess situation on ground",
    "Deploy nearest patrol unit",
    "Set up appropriate traffic control measures",
    "Monitor and update status",
]


def _get_playbook(event_cause: str) -> List[str]:
    cause = event_cause.lower().strip()
    return _PLAYBOOKS.get(cause, _DEFAULT_PLAYBOOK)


# ── DNA Engine ───────────────────────────────────────────────────

# Features used for similarity matching
DNA_FEATURES = [
    "event_cause_encoded",
    "corridor_encoded",
    "hour",
    "priority_encoded",
    "requires_road_closure",
    "zone_encoded",
]


class EventDNAEngine:
    """
    Build a KNN index over historical events and query for similar ones.

    Parameters
    ----------
    df : DataFrame with columns: event_cause, corridor, zone, priority,
         requires_road_closure, start_datetime, duration_hours.
    """

    def __init__(self, df: pd.DataFrame) -> None:
        self._raw = df.copy()
        self._prepare()

    def _prepare(self) -> None:
        df = self._raw.copy()

        # Ensure required columns exist
        df["corridor"] = df["corridor"].fillna("Unknown")
        df["zone"] = df["zone"].fillna("Unknown")
        df["priority"] = df["priority"].fillna("Low")
        df["requires_road_closure"] = df["requires_road_closure"].fillna(False).astype(int)

        if "hour" not in df.columns:
            df["hour"] = pd.to_datetime(
                df["start_datetime"], utc=True, errors="coerce"
            ).dt.hour.fillna(12).astype(int)

        # Label-encode categoricals
        self._le_cause = LabelEncoder()
        self._le_corridor = LabelEncoder()
        self._le_zone = LabelEncoder()
        self._le_priority = LabelEncoder()

        df["event_cause_encoded"] = self._le_cause.fit_transform(df["event_cause"].astype(str))
        df["corridor_encoded"] = self._le_corridor.fit_transform(df["corridor"].astype(str))
        df["zone_encoded"] = self._le_zone.fit_transform(df["zone"].astype(str))
        df["priority_encoded"] = self._le_priority.fit_transform(df["priority"].astype(str))

        # Scale features
        self._scaler = StandardScaler()
        X = df[DNA_FEATURES].values.astype(float)
        X_scaled = self._scaler.fit_transform(X)

        # Build KNN
        self._knn = NearestNeighbors(n_neighbors=10, metric="euclidean", n_jobs=-1)
        self._knn.fit(X_scaled)

        self._indexed_df = df.reset_index(drop=True)

    def _encode_query(self, query: dict) -> np.ndarray:
        """Encode a single query dict into the same feature space."""
        cause = query.get("event_cause", "others")
        corridor = query.get("corridor", "Unknown")
        zone = query.get("zone", "Unknown") or "Unknown"
        priority = query.get("priority", "High")
        closure = int(query.get("requires_road_closure", False))
        hour = int(query.get("hour", 12))

        # Safe label encoding (unseen labels → nearest known)
        def safe_encode(le: LabelEncoder, val: str) -> int:
            if val in le.classes_:
                return int(le.transform([val])[0])
            return 0  # fallback to first class

        vec = np.array([
            safe_encode(self._le_cause, cause),
            safe_encode(self._le_corridor, corridor),
            hour,
            safe_encode(self._le_priority, priority),
            closure,
            safe_encode(self._le_zone, zone),
        ], dtype=float).reshape(1, -1)

        return self._scaler.transform(vec)

    def find_similar(self, query: dict, k: int = 3) -> List[dict]:
        """
        Find top-k similar historical events.

        Returns list of dicts with similarity_pct, event details, playbook.
        """
        k = min(k, len(self._indexed_df))
        q_vec = self._encode_query(query)
        distances, indices = self._knn.kneighbors(q_vec, n_neighbors=k)

        results = []
        max_dist = distances[0].max() if distances[0].max() > 0 else 1.0

        for dist, idx in zip(distances[0], indices[0]):
            row = self._indexed_df.iloc[idx]

            # Inverse distance → similarity percentage
            similarity = max(0.0, (1 - dist / (max_dist + 1e-8)) * 100)

            results.append({
                "similarity_pct": round(similarity, 1),
                "event_cause": str(row.get("event_cause", "unknown")),
                "corridor": str(row.get("corridor", "Unknown")),
                "zone": str(row.get("zone", "Unknown")),
                "priority": str(row.get("priority", "Low")),
                "resolution_hrs": round(float(row.get("duration_hours", 0)), 1),
                "playbook": _get_playbook(str(row.get("event_cause", ""))),
            })

        # Sort by similarity descending
        results.sort(key=lambda x: x["similarity_pct"], reverse=True)
        return results
