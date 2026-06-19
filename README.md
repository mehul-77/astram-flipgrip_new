<div align="center">
  <img src="frontend/public/vite.svg" alt="ASTRAM Logo" width="100"/>
  <h1>ASTRAM</h1>
  <p><strong>Adaptive Street Traffic Risk & Action Monitor</strong></p>
  <p>An advanced, AI-driven, full-stack intelligence platform designed for the Bengaluru Traffic Police to monitor, predict, and mitigate traffic disruptions in real-time.</p>

  <div>
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  </div>
</div>

<br/>

## Overview

**ASTRAM** bridges the gap between reactive traffic management and proactive incident mitigation. By leveraging machine learning models trained on historical event data, ASTRAM predicts the duration and impact of traffic incidents, recommends optimal deployment strategies, and provides deep analytics into traffic patterns.

### ✨ Key Features
- 🔮 **Incident Prediction**: Predict duration, impact score, and severity of live traffic incidents.
- 🧬 **Event DNA**: Find and analyze similar historical incidents using KNN similarity matching to understand past resolution strategies.
- 📊 **Rich Analytics**: Comprehensive dashboards displaying corridor risk, junction risk, hourly distributions, and cascade events.
- 🧠 **Explainable AI (XAI)**: SHAP integration to provide transparency into *why* the model made a specific prediction.
- 👮 **Actionable Recommendations**: Automated deployment recommendations for traffic personnel based on incident severity and zone.
- 📡 **Real-time Drift Monitoring**: Tracks prediction drift and dynamically flags when models require retraining.

---

## 🏗️ System Architecture

ASTRAM is composed of a decoupled modern stack: a React/Vite frontend and a high-performance FastAPI/Python backend.

```mermaid
graph TD
    subgraph Frontend [Frontend: React + Vite + Tailwind]
        UI[User Interface]
        Maps[Leaflet Maps Integration]
        Charts[Recharts Analytics]
        UI --> Maps
        UI --> Charts
    end

    subgraph Backend [Backend: FastAPI + Python]
        API[FastAPI REST Interface]
        ML[ML Engine: XGBoost/RF]
        SHAP[SHAP Explainer]
        KNN[KNN Event DNA]
        API --> ML
        API --> SHAP
        API --> KNN
    end

    UI <-->|JSON via REST API| API
```

---

## 📂 Repository Structure

```text
Astram-Flipgrid/
├── backend/                  # FastAPI & Machine Learning Backend
│   ├── data/                 # Raw event dataset (8,173 records)
│   ├── ml/                   # ML pipeline (training, features, SHAP, KNN)
│   ├── models/               # Trained model artifacts
│   ├── routers/              # API endpoints (/predict, /recommend, etc.)
│   └── ...                   # Python scripts & config files
│
├── frontend/                 # React UI Application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Views (EventDNA, Analytics, etc.)
│   │   └── ...
│   └── ...                   # Vite & Tailwind configuration files
│
└── README.md                 # You are here!
```

---

## 🚀 Getting Started

Follow these steps to run the application locally.

### 1️⃣ Starting the Backend
The backend runs on Python 3.11+ and uses FastAPI.

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*The API will be live at `http://localhost:8000`*

### 2️⃣ Starting the Frontend
The frontend uses Node.js, Vite, React 19, and Tailwind CSS 4.

```bash
cd frontend
npm install
npm run dev
```
*The web interface will be live at `http://localhost:3000` (or the port Vite provides)*

---

## 🧠 Machine Learning Engine
ASTRAM's prediction core utilizes advanced ML techniques:
- **Algorithms:** Evaluates RandomForest, XGBoost, and LightGBM to select the most performant model.
- **Features Engineered:** Temporal (hour, day, weekend flags), Categorical (event_cause, corridor, zone), and Binary markers (road_closure, breakdown_reason).
- **Impact Scoring:** Custom weighted formula factoring in duration, closures, priority, and planning.

---

## 📜 License

Built for the ASTRAM hackathon. 
Released under the **MIT License**.
