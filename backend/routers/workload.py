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
df['requires_road_closure'] = df['requires_road_closure'].astype(str).str.lower().isin(['true','1','yes'])

def compute_workload():
    valid_df = df.dropna(subset=['police_station']).copy()
    grouped = valid_df.groupby('police_station')
    
    stations = []
    for station, group in grouped:
        incident_count = len(group)
        if incident_count == 0: continue
            
        avg_dur = group['duration_hours'].mean()
        high_pri = (group['priority'] == 'High').sum()
        high_pri_rate = high_pri / incident_count
        road_closure = group['requires_road_closure'].sum()
        
        # Raw workload score
        raw_score = (incident_count * 0.4) + (avg_dur * 0.3) + (high_pri_rate * 100 * 0.3)
        
        stations.append({
            "police_station": station,
            "incident_count": incident_count,
            "avg_duration_hours": float(avg_dur) if pd.notnull(avg_dur) else 0.0,
            "high_priority_count": int(high_pri),
            "high_priority_rate": float(high_pri_rate),
            "road_closure_count": int(road_closure),
            "raw_score": float(raw_score) if pd.notnull(raw_score) else 0.0
        })
        
    if not stations: return []
    
    # Normalize workload_score 0-100
    max_raw = max(s['raw_score'] for s in stations)
    if max_raw == 0: max_raw = 1
    
    for s in stations:
        s['workload_score'] = (s['raw_score'] / max_raw) * 100
        
    # Sort by workload score descending
    stations.sort(key=lambda x: x['workload_score'], reverse=True)
    
    # Percentiles for status classification
    n = len(stations)
    top_20_idx = max(1, int(n * 0.2))
    bottom_20_idx = min(n - 1, n - max(1, int(n * 0.2)))
    
    for i, s in enumerate(stations):
        if i < top_20_idx:
            s['status'] = 'OVERLOADED'
        elif i >= bottom_20_idx:
            s['status'] = 'UNDERUTILISED'
        else:
            s['status'] = 'BALANCED'
            
    return stations

@router.get("/workload/stations")
def get_workload_stations():
    stations = compute_workload()
    # remove raw score to clean output, limit decimals
    for s in stations:
        del s['raw_score']
        s['avg_duration_hours'] = round(s['avg_duration_hours'], 1)
        s['high_priority_rate'] = round(s['high_priority_rate'], 3)
        s['workload_score'] = round(s['workload_score'], 1)
    return stations

@router.get("/workload/recommendation")
def get_workload_recommendation():
    stations = compute_workload()
    overloaded = [s for s in stations if s['status'] == 'OVERLOADED'][:3]
    underutilised = [s for s in stations if s['status'] == 'UNDERUTILISED'][-3:] # get the absolute bottom ones
    underutilised.reverse() # bottom-most first
    
    recommendations = []
    for i in range(min(len(overloaded), len(underutilised))):
        o_st = overloaded[i]
        u_st = underutilised[i]
        
        ratio = 0
        if u_st['high_priority_count'] > 0:
            ratio = round(o_st['high_priority_count'] / u_st['high_priority_count'], 1)
        else:
            ratio = o_st['high_priority_count']
            
        units = 2 if o_st['workload_score'] > 80 else 1
        
        recommendations.append({
            "from_station": u_st['police_station'],
            "to_station": o_st['police_station'],
            "suggested_unit_transfer": units,
            "reason": f"{o_st['police_station']} handles {ratio}x more high-priority incidents."
        })
        
    return recommendations
