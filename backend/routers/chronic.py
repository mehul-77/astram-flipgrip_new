from fastapi import APIRouter
import pandas as pd
from pathlib import Path

router = APIRouter()

csv_path = Path(__file__).parent.parent / "data" / "ASTRAM_event_data.csv"
df = pd.read_csv(csv_path)

df['start_dt'] = pd.to_datetime(df['start_datetime'], utc=True, errors='coerce')
df['closed_dt'] = pd.to_datetime(df['closed_datetime'], utc=True, errors='coerce')
df['duration_hours'] = (df['closed_dt'] - df['start_dt']).dt.total_seconds() / 3600
df['duration_hours'] = df['duration_hours'].clip(lower=0)
df['requires_road_closure'] = df['requires_road_closure'].astype(str).str.lower().isin(['true','1','yes'])

@router.get("/chronic/problems")
def get_chronic_problems():
    valid_df = df.dropna(subset=['corridor', 'event_cause']).copy()
    
    grouped = valid_df.groupby(['corridor', 'event_cause'])
    
    results = []
    for (corridor, cause), group in grouped:
        count = len(group)
        if count >= 10:
            avg_duration = group['duration_hours'].mean()
            total_hours = group['duration_hours'].sum()
            closure_rate = (group['requires_road_closure'].sum() / count) * 100
            latest = group['start_dt'].max()
            
            if count >= 50:
                severity = "SEVERE"
            elif count >= 25:
                severity = "HIGH"
            else:
                severity = "MODERATE"
                
            results.append({
                "corridor": corridor,
                "event_cause": cause,
                "occurrences": count,
                "avg_duration_hours": round(float(avg_duration), 1) if pd.notnull(avg_duration) else 0,
                "total_hours_lost": round(float(total_hours), 1) if pd.notnull(total_hours) else 0,
                "road_closure_rate": round(float(closure_rate), 1),
                "latest_occurrence": latest.isoformat() if pd.notnull(latest) else None,
                "severity": severity
            })
            
    # Sort by occurrences descending, take top 20
    results.sort(key=lambda x: x['occurrences'], reverse=True)
    return results[:20]

@router.get("/chronic/corridors")
def get_chronic_corridors():
    valid_df = df.dropna(subset=['corridor', 'event_cause']).copy()
    corridor_groups = valid_df.groupby('corridor')
    
    results = []
    for corridor, group in corridor_groups:
        cause_counts = group['event_cause'].value_counts().head(3)
        top_causes = [{"cause": str(k), "count": int(v)} for k, v in cause_counts.items()]
        results.append({
            "corridor": str(corridor),
            "top_causes": top_causes
        })
        
    # Sort by total incidents roughly or just return
    results.sort(key=lambda x: sum(c['count'] for c in x['top_causes']), reverse=True)
    return results

@router.get("/chronic/trend")
def get_chronic_trend(corridor: str, event_cause: str):
    valid_df = df.dropna(subset=['corridor', 'event_cause', 'month']).copy()
    mask = (valid_df['corridor'] == corridor) & (valid_df['event_cause'] == event_cause)
    filtered = valid_df[mask]
    
    if filtered.empty:
        return []
        
    monthly = filtered.groupby('month').size().reset_index(name='count')
    # ensure all 12 months exist
    all_months = pd.DataFrame({'month': range(1, 13)})
    monthly = pd.merge(all_months, monthly, on='month', how='left').fillna(0)
    
    return monthly.to_dict(orient='records')

