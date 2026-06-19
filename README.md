<div align="center">

# 🚦 ASTRAM 
**Adaptive Street Traffic Risk & Action Monitor**

[![React](https://img.shields.io/badge/React-19-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4.svg?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg?style=for-the-badge&logo=python)](https://python.org)
[![Machine Learning](https://img.shields.io/badge/Machine%20Learning-XGBoost%20%7C%20LightGBM-FF6F00.svg?style=for-the-badge)](https://scikit-learn.org/)

An AI-powered traffic incident prediction, impact analysis, and deployment recommendation system designed for the **Bengaluru Traffic Police**.

</div>

---

## Overview

**ASTRAM** bridges the gap between reactive traffic management and proactive incident mitigation. By leveraging machine learning models trained on historical event data, ASTRAM predicts the duration and impact of traffic incidents, recommends optimal deployment strategies, and provides deep analytics into traffic patterns.

### Key Features
-  **Incident Prediction**: Predict duration, impact score, and severity of live traffic incidents.
-  **Event DNA**: Find and analyze similar historical incidents using KNN similarity matching to understand past resolution strategies.
-  **Rich Analytics**: Comprehensive dashboards displaying corridor risk, junction risk, hourly distributions, and cascade events.
-  **Explainable AI (XAI)**: SHAP integration to provide transparency into *why* the model made a specific prediction.
-  **Actionable Recommendations**: Automated deployment recommendations for traffic personnel based on incident severity and zone.
-  **Real-time Drift Monitoring**: Tracks prediction drift and dynamically flags when models require retraining.

---

##  System Architecture

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

##  Repository Structure

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

##  Getting Started

Follow these steps to run the application locally.

### 1. Starting the Backend
The backend runs on Python 3.11+ and uses FastAPI.

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run Exploratory Data Analysis (generates analytics CSVs & visuals)
python eda.py

# Train the ML Models
python -m ml.train

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
> **Note:** The API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2️. Starting the Frontend
The frontend uses Node.js, Vite, React 19, and Tailwind CSS 4.

```bash
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```
> **Note:** The UI will typically be available at [http://localhost:5173](http://localhost:5173).

---

## Machine Learning Engine
ASTRAM's prediction core utilizes advanced ML techniques:
- **Algorithms:** Evaluates RandomForest, XGBoost, and LightGBM to select the most performant model.
- **Features Engineered:** Temporal (hour, day, weekend flags), Categorical (event_cause, corridor, zone), and Binary markers (road_closure, breakdown_reason).
- **Impact Scoring:** Custom weighted formula factoring in duration, closures, priority, and planning.

---

##  License

Built for the ASTRAM hackathon. 
Released under the **MIT License**.
