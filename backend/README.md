# ASTRAM — Adaptive Street Traffic Risk & Action Monitor

> AI-powered traffic incident prediction, impact analysis, and deployment recommendation system for Bengaluru Traffic Police.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![ML](https://img.shields.io/badge/ML-XGBoost%20%7C%20LightGBM%20%7C%20RandomForest-orange)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js Frontend                       │
│               (Vercel — separate repo)                    │
└────────────────────┬─────────────────────────────────────┘
                     │ REST API (JSON)
┌────────────────────▼─────────────────────────────────────┐
│                  FastAPI Backend                          │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌─────────────────┐ │
│  │ /predict │ │/recommend│ │ /dna │ │   /analytics    │ │
│  └────┬─────┘ └────┬─────┘ └──┬───┘ └───────┬─────────┘ │
│       │            │          │              │           │
│  ┌────▼────────────▼──────────▼──────────────▼─────────┐ │
│  │          ML Engine (scikit-learn / XGBoost)          │ │
│  │   ┌─────────┐  ┌──────────┐  ┌──────────────────┐  │ │
│  │   │  Model  │  │   SHAP   │  │    KNN DNA       │  │ │
│  │   │ predict │  │ explain  │  │   similarity     │  │ │
│  │   └─────────┘  └──────────┘  └──────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Drift Monitor & Feedback               │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
backend/
├── data/
│   └── ASTRAM_event_data.csv       # Raw event dataset (8,173 records)
├── outputs/                         # EDA exports (CSVs + PNGs)
├── models/                          # Trained model artifacts
│   ├── best_model.pkl
│   ├── preprocessor.pkl
│   ├── feature_maps.pkl
│   └── model_metrics.json
├── ml/
│   ├── features.py                  # Feature engineering pipeline
│   ├── train.py                     # Model training & selection
│   ├── shap_engine.py               # SHAP explainability
│   └── knn_dna.py                   # KNN similar event matching
├── routers/
│   ├── predict.py                   # POST /api/predict
│   ├── recommend.py                 # POST /api/recommend
│   ├── dna.py                       # POST /api/dna
│   ├── analytics.py                 # GET  /api/analytics
│   └── feedback.py                  # POST /api/feedback
├── schemas/
│   ├── requests.py                  # Pydantic request models
│   └── responses.py                 # Pydantic response models
├── utils/
│   ├── scoring.py                   # Impact score & severity
│   ├── drift.py                     # Prediction drift monitor
│   └── loader.py                    # Singleton resource loader
├── tests/                           # pytest test suite
├── main.py                          # FastAPI entry point
├── eda.py                           # Exploratory Data Analysis
├── requirements.txt
├── render.yaml                      # Render deployment config
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run EDA (generates analytics CSVs)

```bash
python eda.py
```

This creates `outputs/corridor_risk.csv`, `junction_risk.csv`, `hourly_distribution.csv`, `monthly_trend.csv`, `cascade_stats.csv`, and 14 visualisation PNGs.

### 3. Train the ML Model

```bash
python -m ml.train
```

Output:
- `models/best_model.pkl` — best performing model
- `models/preprocessor.pkl` — fitted feature transformer
- `models/feature_maps.pkl` — corridor/junction frequency & risk maps
- `models/model_metrics.json` — MAE, RMSE, R² comparison

### 4. Start the API Server

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs**

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | System health check |
| `POST` | `/api/predict` | Predict incident duration & impact |
| `POST` | `/api/recommend` | Generate deployment recommendations |
| `POST` | `/api/dna` | Find similar historical incidents |
| `GET` | `/api/analytics` | Full analytics dashboard data |
| `GET` | `/api/analytics/corridors` | Corridor risk ranking |
| `GET` | `/api/analytics/junctions` | Junction risk ranking |
| `GET` | `/api/analytics/hourly` | Hourly incident distribution |
| `GET` | `/api/analytics/monthly` | Monthly incident trend |
| `GET` | `/api/analytics/cascade` | Cascade event statistics |
| `POST` | `/api/feedback` | Log prediction feedback |
| `GET` | `/api/feedback/drift` | Current drift status |

### Example: Predict

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "event_cause": "water_logging",
    "corridor": "Mysore Road",
    "priority": "High",
    "requires_road_closure": true
  }'
```

Response:
```json
{
  "duration_hours": 14.5,
  "impact_score": 84.1,
  "severity": "Critical",
  "shap_factors": [
    {"feature": "corridor: Mysore Road", "contribution": 22.3},
    {"feature": "event_cause: water_logging", "contribution": 18.1}
  ],
  "confidence": 72.5
}
```

### Example: Recommend

```bash
curl -X POST http://localhost:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "event_cause": "water_logging",
    "corridor": "Mysore Road",
    "impact_score": 84,
    "zone": "South Zone 1",
    "requires_road_closure": true,
    "priority": "High",
    "duration_hours": 16
  }'
```

### Example: DNA (Similar Events)

```bash
curl -X POST http://localhost:8000/api/dna \
  -H "Content-Type: application/json" \
  -d '{
    "event_cause": "water_logging",
    "corridor": "Mysore Road",
    "priority": "High",
    "hour": 14,
    "k": 3
  }'
```

---

## 🧪 Testing

```bash
pytest tests/ -v
```

---

## 🧠 ML Pipeline Details

### Feature Engineering
- **Temporal**: hour, day_of_week, month, week_of_year, is_weekend, is_night, is_peak_hour
- **Categorical**: event_type, event_cause, corridor, zone, priority (OneHotEncoded)
- **Binary flags**: requires_road_closure, has_vehicle_info, has_breakdown_reason
- **Risk features**: corridor_frequency, junction_frequency, corridor_risk_score, junction_risk_score
- **Cascade**: flag for events on same corridor within 2 hours

### Models Compared
| Model | MAE | RMSE | R² |
|-------|-----|------|-----|
| RandomForest | — | — | — |
| XGBoost | — | — | — |
| LightGBM | — | — | — |

*Run `python -m ml.train` to populate actual metrics.*

### Impact Score Formula
```
impact = (min(duration, 48) / 48) × 50
       + closure × 25
       + priority_high × 15
       + planned × 10
```

### SHAP Explainability
TreeExplainer generates per-instance feature contributions, normalised to sum to 100%.

### Drift Monitoring
Tracks `|actual - predicted| / predicted × 100` per event cause. Flags **DRIFTING** when average error > 30%.

---

## 🚢 Deployment (Render)

1. Push to GitHub
2. Connect repo to Render
3. Render reads `render.yaml` and auto-deploys
4. Build step runs EDA + model training
5. Health check at `/health`

---

## 📄 License

Built for the ASTRAM hackathon. MIT License.
