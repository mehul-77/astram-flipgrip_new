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

## 🌟 Overview

**ASTRAM** takes raw traffic event data and transforms it into actionable, predictive intelligence. Instead of just reacting to traffic jams and accidents, ASTRAM allows dispatchers to *anticipate* cascading failures, rebalance officer workloads before police stations become overwhelmed, and identify historical "Event DNA" to deploy proven resolution strategies.

The entire application is wrapped in a bespoke, premium dark-mode interface powered by **React** and **Framer Motion**, delivering a highly fluid, cinematic data-exploration experience.

---

## 🚀 Core Intelligence Modules

ASTRAM is divided into several specialized intelligence dashboards:

### 1. 🔮 Impact Prediction Engine
Uses a trained Random Forest machine learning pipeline to predict the exact duration of a disruption, how severely it will impact surrounding corridors, and whether it will require road closures.

### 2. 🧬 Event DNA Matcher
Algorithms map the "genetic sequence" of a live incident (location + time + cause) against historical databases. It instantly retrieves similar past incidents to show how long they took to resolve and what strategies worked best.

### 3. ⚖️ Workload Balancer
Tracks the real-time fatigue and incident load of every police station in the city. The system automatically recommends precise unit transfers (e.g., "Move 2 units from *Devanahalli Airport* to *HAL Old Airport*") to prevent any single station from becoming critically overwhelmed.

### 4. 🌙 Night Shift Operations
A specialized view isolating 9 PM - 6 AM data. It visualizes the 24-hour velocity trends and calculates the exact overnight officer placements required across dangerous corridors.

### 5. 🌡️ Zone Stress Analytics
A high-level bento-grid dashboard measuring the aggregated "Stress Score" of entire city zones, tracking peak simultaneous incidents, and identifying zones that need immediate pre-deployment of officers.

### 6. ⚠️ Precursor Warning System
Detects subtle "trigger" events (like a localized waterlogging report) and predicts the probability of it cascading into a major gridlock (e.g., severe congestion on the Outer Ring Road).

### 7. 🔄 Chronic Problem Detection
Isolates systemic, recurring infrastructural failures (like repeating signal failures or persistent VIP movement bottlenecks) and calculates exactly how many man-hours are being wasted on them.

---

## 💻 Tech Stack & Architecture

### **Frontend (The Interface)**
* **Framework:** React 18 + Vite (TypeScript)
* **Styling:** Tailwind CSS (Custom App-Dark Theme)
* **Animation:** Framer Motion (Spring-physics layout transitions, hover spotlights)
* **Data Visualization:** Recharts (Bespoke customized charts with dynamic tooltips)
* **Icons:** Lucide React

### **Backend (The Brain)**
* **Framework:** FastAPI (Python)
* **Data Processing:** Pandas & Scikit-Learn
* **Machine Learning:** Pre-trained Random Forest Classifier
* **Dataset:** 40k+ historical Bengaluru traffic records (`ASTRAM_event_data.csv`)

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1. Start the Backend API
The backend requires the `ASTRAM_event_data.csv` dataset and the pre-trained ML models.

```bash
cd backend
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

The ASTRAM frontend was engineered to feel like a high-end command center:
- **Spotlight Hover Effects:** Cards feature interactive, mouse-tracking radial gradients.
- **Spring-Loaded Typography:** Numbers don't just change; they tick and bounce using Framer Motion physics.
- **Glassmorphism:** Layered surfaces with deep shadows and backdrop-blurs.
- **No "AI Slop":** Every chart, badge, and layout has been meticulously hand-coded for perfect data-density and editorial-quality typography.

---

<div align="center">
  <p><i>Built for the Bengaluru Traffic Police Hackathon</i></p>
</div>
