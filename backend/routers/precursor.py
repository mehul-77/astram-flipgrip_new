from fastapi import APIRouter
from pydantic import BaseModel
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

# Build transition matrix once
def build_transition_matrix():
    valid_df = df.dropna(subset=['corridor', 'event_cause', 'start_dt']).copy()
    valid_df.sort_values(by=['corridor', 'start_dt'], inplace=True)
    
    # Track counts for probabilities
    cause_counts = valid_df['event_cause'].value_counts().to_dict()
    
    transitions = []
    
    # For performance, iterate through groups
    for corridor, group in valid_df.groupby('corridor'):
        group_records = group.to_dict(orient='records')
        for i in range(len(group_records) - 1):
            curr = group_records[i]
            # check subsequent events
            for j in range(i + 1, len(group_records)):
                nxt = group_records[j]
                time_diff = (nxt['start_dt'] - curr['start_dt']).total_seconds() / 3600
                if time_diff <= 2.0:
                    transitions.append({
                        "corridor": corridor,
                        "trigger": curr['event_cause'],
                        "follow_up": nxt['event_cause'],
                        "time_to_next_hours": time_diff,
                        "next_duration_hours": nxt['duration_hours']
                    })
                else:
                    break # time sorted, so if > 2 hours we stop looking ahead
                    
    trans_df = pd.DataFrame(transitions)
    if trans_df.empty:
        return [], cause_counts
        
    grouped = trans_df.groupby(['trigger', 'follow_up']).agg(
        count=('corridor', 'count'),
        avg_time_to_next_hours=('time_to_next_hours', 'mean'),
        avg_next_duration_hours=('next_duration_hours', 'mean')
    ).reset_index()
    
    # Calculate probabilities
    grouped['follow_probability'] = grouped.apply(lambda row: row['count'] / cause_counts.get(row['trigger'], 1), axis=1)
    
    return grouped.to_dict(orient='records'), cause_counts

_transitions, _cause_counts = build_transition_matrix()

@router.get("/precursor/map")
def get_precursor_map():
    results = [t for t in _transitions if t['count'] >= 5 and t['follow_probability'] >= 0.2]
    results.sort(key=lambda x: x['follow_probability'], reverse=True)
    
    for r in results:
        t_next = r['avg_time_to_next_hours']
        t_dur = r['avg_next_duration_hours']
        prob = r['follow_probability']
        r['avg_time_to_next_hours'] = round(float(t_next), 2) if pd.notnull(t_next) else 0.0
        r['avg_next_duration_hours'] = round(float(t_dur), 2) if pd.notnull(t_dur) else 0.0
        r['follow_probability'] = round(float(prob), 3) if pd.notnull(prob) else 0.0
        
    return results

class PrecursorCheckRequest(BaseModel):
    event_cause: str
    corridor: str

@router.post("/precursor/check")
def check_precursor(req: PrecursorCheckRequest):
    # Find transitions matching the trigger
    matches = [t for t in _transitions if t['trigger'] == req.event_cause]
    matches.sort(key=lambda x: x['follow_probability'], reverse=True)
    
    top_3 = matches[:3]
    if not top_3:
        return {
            "highest_risk_followup": None,
            "warning_level": "LOW",
            "avg_time_to_next": None,
            "recommended_preemptive_action": "Monitor situation. No significant cascading risk detected.",
            "top_followups": []
        }
        
    highest = top_3[0]
    prob = highest['follow_probability']
    
    warning_level = "LOW"
    if prob > 0.5:
        warning_level = "HIGH"
    elif prob >= 0.3:
        warning_level = "MEDIUM"
        
    action = f"Pre-position 1 officer near {req.corridor} intersections."
    if warning_level == "HIGH":
        action = f"Pre-position 2 officers and a towing unit on {req.corridor} immediately."
        
    return {
        "highest_risk_followup": highest['follow_up'],
        "warning_level": warning_level,
        "avg_time_to_next": round(float(highest['avg_time_to_next_hours']), 2) if pd.notnull(highest['avg_time_to_next_hours']) else 0.0,
        "recommended_preemptive_action": action,
        "top_followups": [
            {
                "follow_up": m['follow_up'],
                "probability": round(float(m['follow_probability']), 3) if pd.notnull(m['follow_probability']) else 0.0,
                "avg_time_to_next_hours": round(float(m['avg_time_to_next_hours']), 2) if pd.notnull(m['avg_time_to_next_hours']) else 0.0
            }
            for m in top_3
        ]
    }
