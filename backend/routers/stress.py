from fastapi import APIRouter, HTTPException, Query
import pandas as pd
import numpy as np
from pathlib import Path
import math

router = APIRouter()

# Load data at module level
csv_path = Path(__file__).parent.parent / "data" / "ASTRAM_event_data.csv"
df = pd.read_csv(csv_path)

# Data Preprocessing
df['start_dt'] = pd.to_datetime(df['start_datetime'], utc=True, errors='coerce')
df['closed_dt'] = pd.to_datetime(df['closed_datetime'], utc=True, errors='coerce')
df['duration_hours'] = (df['closed_dt'] - df['start_dt']).dt.total_seconds() / 3600
df['duration_hours'] = df['duration_hours'].clip(lower=0)
df['hour'] = df['start_dt'].dt.hour
df['dow'] = df['start_dt'].dt.dayofweek
df['month'] = df['start_dt'].dt.month
df['is_weekend'] = df['dow'].isin([5, 6])
df['is_night'] = df['hour'].apply(lambda h: h >= 21 or h <= 5 if pd.notnull(h) else False)
df['is_peak_hour'] = df['hour'].isin([8, 9, 17, 18, 19])
df['bucket_3h'] = df['start_dt'].dt.floor('3h')
df['requires_road_closure'] = df['requires_road_closure'].astype(str).str.lower().isin(['true','1','yes'])
df['impact_score'] = (
    (df['duration_hours'].clip(0, 48) / 48) * 50 +
    df['requires_road_closure'].astype(int) * 25 +
    (df['priority'] == 'High').astype(int) * 15 +
    (df['event_type'] == 'planned').astype(int) * 10
)

@router.get("/stress/zones")
def get_zone_stress():
    valid_df = df.dropna(subset=['zone', 'bucket_3h']).copy()
    
    # Group by zone and 3-hour window
    grouped = valid_df.groupby(['zone', 'bucket_3h']).size().reset_index(name='simultaneous')
    
    latest_bucket = valid_df['bucket_3h'].max()
    
    # Compute max across all zones for normalization
    global_max_simultaneous = grouped['simultaneous'].max()
    if global_max_simultaneous == 0:
        global_max_simultaneous = 1
        
    zone_stats = []
    
    for zone, group in grouped.groupby('zone'):
        max_sim = int(group['simultaneous'].max())
        avg_sim = float(group['simultaneous'].mean())
        high_stress = int((group['simultaneous'] >= 3).sum())
        
        # Stress score out of 100
        stress_score = (max_sim / global_max_simultaneous) * 100
        
        # Get current stress (if zone has events in the latest bucket)
        current_rows = group[group['bucket_3h'] == latest_bucket]
        if not current_rows.empty:
            curr_sim = int(current_rows.iloc[0]['simultaneous'])
            current_stress = (curr_sim / global_max_simultaneous) * 100
        else:
            current_stress = 0.0
            
        zone_stats.append({
            "zone": zone,
            "max_simultaneous": max_sim,
            "avg_simultaneous": round(avg_sim, 2),
            "stress_score": round(stress_score, 1),
            "current_stress": round(current_stress, 1),
            "high_stress_moments": high_stress
        })
        
    # Sort by stress_score descending
    zone_stats.sort(key=lambda x: x['stress_score'], reverse=True)
    return zone_stats

@router.get("/stress/timeline")
def get_stress_timeline(zone: str = Query(..., description="The zone name")):
    valid_df = df.dropna(subset=['zone', 'bucket_3h']).copy()
    zone_df = valid_df[valid_df['zone'] == zone]
    
    if zone_df.empty:
        return []
        
    grouped = zone_df.groupby('bucket_3h').size().reset_index(name='simultaneous')
    
    # Normalize timeline stress by max in this zone (or global if preferred, let's use global for consistency)
    global_grouped = valid_df.groupby(['zone', 'bucket_3h']).size().reset_index(name='simultaneous')
    global_max_simultaneous = global_grouped['simultaneous'].max()
    if global_max_simultaneous == 0:
        global_max_simultaneous = 1
        
    timeline = []
    for _, row in grouped.iterrows():
        sim_events = int(row['simultaneous'])
        stress_lvl = (sim_events / global_max_simultaneous) * 100
        timeline.append({
            "bucket": row['bucket_3h'].isoformat() if pd.notnull(row['bucket_3h']) else None,
            "simultaneous_events": sim_events,
            "stress_level": round(stress_lvl, 1)
        })
        
    # Sort by time
    timeline.sort(key=lambda x: x['bucket'] if x['bucket'] else "")
    return timeline
