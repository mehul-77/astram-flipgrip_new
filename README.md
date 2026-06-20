<div align="center">
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

## 🌟 Overview

**ASTRAM** takes raw traffic event data and transforms it into actionable, predictive intelligence. Instead of just reacting to traffic jams and accidents, ASTRAM allows dispatchers to *anticipate* cascading failures, rebalance officer workloads before police stations become overwhelmed, and identify historical "Event DNA" to deploy proven resolution strategies.

The entire application is wrapped in a bespoke, premium dark-mode interface powered by **React** and **Framer Motion**, delivering a highly fluid, cinematic data-exploration experience.

---

## 🚀 Core Intelligence Modules

ASTRAM offers a comprehensive suite of **10 specialized intelligence dashboards**:

### 1. 📊 Traffic Intelligence Dashboard (Analytics)
The central command center. Offers high-level operational metrics, real-time active incident counts, historical trend charts, and response time breakdowns to give dispatchers an immediate pulse of the city.

### 2. 🗺️ Live Incident Simulation
An interactive geospatial map that visualizes the cascading ripple effect of a severe traffic incident on surrounding road networks, helping police block off the correct arterial roads before gridlock spreads.

### 3. 🔮 Impact Prediction & Recommender Engine
Uses a trained Random Forest machine learning pipeline to predict the exact duration of a new disruption, how severely it will impact traffic, and whether it will require road closures. It instantly recommends specific unit deployments.

### 4. 🧬 Event DNA Matcher
Algorithms map the "genetic sequence" of a live incident (location + time + cause) against historical databases. It instantly retrieves mathematically similar past incidents to show how long they took to resolve and what strategies worked best.

### 5. 📉 AI Concept Drift Monitor
Machine learning models degrade as city traffic patterns change over time. This dashboard continuously tracks ML model accuracy, prediction errors, and data drift, ensuring the AI remains highly reliable month over month.

### 6. 🌡️ Zone Stress Analytics
A high-level, premium bento-grid dashboard measuring the aggregated "Stress Score" of entire city zones, tracking peak simultaneous incidents, and identifying specific zones that need immediate pre-deployment of officers.

### 7. ⚠️ Precursor Warning System (Cascading Risk)
Detects subtle "trigger" events (like a localized waterlogging report or a minor vehicle breakdown) and predicts the exact probability of it cascading into a major compounding gridlock on critical corridors (like the Outer Ring Road).

### 8. 🔄 Chronic Problem Detection
Isolates systemic, recurring infrastructural failures (like repeating signal failures or persistent VIP movement bottlenecks in the exact same location) and calculates the devastating amount of man-hours being wasted on them.

### 9. ⚖️ Workload Balancer
Tracks the real-time fatigue and active incident load of every police station in the city. The system automatically recommends precise unit transfers (e.g., "Move 2 units from *Devanahalli* to *HAL Airport*") to prevent any single station from becoming critically overwhelmed.

### 10. 🌙 Night Shift Operations
A specialized view isolating 9 PM - 6 AM data. It visualizes the unique 24-hour velocity trends of nighttime driving and calculates the exact overnight officer placements required to handle speeding or late-night cargo accidents.

---

## 💻 Tech Stack & Architecture

### **Frontend (The Interface)**
* **Framework:** React 18 + Vite (TypeScript)
* **Styling:** Tailwind CSS (Custom App-Dark Theme)
* **Animation:** Framer Motion (Spring-physics layout transitions, dynamic hover spotlights)
* **Data Visualization:** Recharts (Bespoke customized charts with dynamic tooltips)
* **Icons:** Lucide React

### **Backend (The Brain)**
* **Framework:** FastAPI (Python)
* **Data Processing:** Pandas & Scikit-Learn
* **Machine Learning:** Pre-trained Random Forest Classifier
* **Dataset:** 40,000+ historical Bengaluru traffic records (`ASTRAM_event_data.csv`)

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1. Start the Backend API
The backend requires the `ASTRAM_event_data.csv` dataset and the pre-trained ML models.

```bash
cd backend
# Optional: Create a virtual environment
# python -m venv venv
# source venv/bin/activate  # On Windows use `venv\Scripts\activate`

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*The API will be live at `http://localhost:8000`*

### 2. Start the Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
*The web interface will be live at `http://localhost:3000` (or the port Vite provides)*

---

## 🎨 Design Philosophy

The ASTRAM frontend was meticulously engineered to feel less like a standard admin panel and more like a high-end, cinematic command center:
- **Spotlight Hover Effects:** Cards feature interactive, mouse-tracking radial gradients that illuminate as you explore data.
- **Spring-Loaded Typography:** Numbers and charts don't just update instantly; they tick and bounce using Framer Motion spring physics.
- **Deep UI Depth:** Layered surfaces with heavy backdrop-blurs, ultra-thin borders, and deep shadows provide immense visual hierarchy.
- **Data Density without Clutter:** Every chart, badge, and Bento-grid layout has been hand-coded for perfect editorial-quality typography.

---

<div align="center">
  <p><i>Built for the GridLock Hackathon 2.0 </i></p>
</div>
