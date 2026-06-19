from fastapi import APIRouter
import pandas as pd
import numpy as np
from pathlib import Path

router = APIRouter()

csv_path = Path(__file__).parent.parent / "data" / "ASTRAM_event_data.csv"
df = pd.read_csv(csv_path)

df['start_dt'] = pd.to_datetime(df['start_datetime'], utc=True, errors='coerce')
df['closed_dt'] = pd.to_datetime(df['closed_datetime'], utc=True, errors='coerce')
df['duration_hours'] = (df['closed_dt'] - df['start_dt']).dt.total_seconds() / 3600
df['duration_hours'] = df['duration_hours'].clip(lower=0)
df['hour'] = df['start_dt'].dt.hour
df['requires_road_closure'] = df['requires_road_closure'].astype(str).str.lower().isin(['true','1','yes'])

def is_night(h):
    if pd.isnull(h): return False
    return h >= 21 or h <= 5

df['is_night_flag'] = df['hour'].apply(is_night)

@router.get("/nightshift/overview")
def get_nightshift_overview():
    valid_df = df.dropna(subset=['hour']).copy()
    
    # Hourly aggregations
    hourly = []
    for h in range(24):
        group = valid_df[valid_df['hour'] == h]
        count = len(group)
        if count == 0:
            hourly.append({
                "hour": h, "incident_count": 0, "avg_duration_hours": 0.0,
                "high_priority_rate": 0.0, "road_closure_rate": 0.0
            })
            continue
            
        avg_dur = group['duration_hours'].mean()
        high_pri = (group['priority'] == 'High').sum() / count
        closure = group['requires_road_closure'].sum() / count
        
        hourly.append({
            "hour": h,
            "incident_count": count,
            "avg_duration_hours": round(float(avg_dur), 2) if pd.notnull(avg_dur) else 0.0,
            "high_priority_rate": round(float(high_pri), 3),
            "road_closure_rate": round(float(closure), 3)
        })
        
    # Summary stats
    total_incidents = len(valid_df)
    night_df = valid_df[valid_df['is_night_flag'] == True]
    day_df = valid_df[valid_df['is_night_flag'] == False]
    
    night_count = len(night_df)
    night_pct = (night_count / total_incidents) * 100 if total_incidents > 0 else 0
    
    night_avg_dur = night_df['duration_hours'].mean()
    day_avg_dur = day_df['duration_hours'].mean()
    
    night_avg_dur = float(night_avg_dur) if pd.notnull(night_avg_dur) else 0.0
    day_avg_dur = float(day_avg_dur) if pd.notnull(day_avg_dur) else 0.0
    
    penalty = 0.0
    if day_avg_dur > 0:
        penalty = ((night_avg_dur - day_avg_dur) / day_avg_dur) * 100
        
    summary = {
        "night_incident_pct": round(night_pct, 1),
        "night_avg_duration": round(night_avg_dur, 2),
        "day_avg_duration": round(day_avg_dur, 2),
        "night_resolution_penalty": round(penalty, 1)
    }
    
    return {"hourly": hourly, "summary": summary}

@router.get("/nightshift/corridors")
def get_nightshift_corridors():
    valid_df = df.dropna(subset=['hour', 'corridor']).copy()
    night_df = valid_df[valid_df['is_night_flag'] == True]
    
    grouped = night_df.groupby('corridor')
    corridors = []
    
    for corridor, group in grouped:
        count = len(group)
        avg_dur = group['duration_hours'].mean()
        closure_rate = group['requires_road_closure'].sum() / count if count > 0 else 0
        
        officers = 2
        if count > 50:
            officers = 8
        elif count > 20:
            officers = 4
            
        corridors.append({
            "corridor": corridor,
            "night_count": count,
            "night_avg_duration": round(float(avg_dur), 2) if pd.notnull(avg_dur) else 0.0,
            "night_closure_rate": round(float(closure_rate), 3),
            "recommended_overnight_officers": officers
        })
        
    corridors.sort(key=lambda x: x['night_count'], reverse=True)
    return corridors[:10]
