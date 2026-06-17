"""
main.py
───────
ASTRAM FastAPI application entry point.

Run locally:
    uvicorn main:app --reload --port 8000

Endpoints:
    GET  /health           → system health check
    POST /api/predict      → predict incident impact
    POST /api/recommend    → deployment recommendations
    POST /api/dna          → similar historical events
    GET  /api/analytics    → analytics dashboard data
    POST /api/feedback     → log prediction feedback
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analytics, dna, feedback, predict, recommend
from schemas.responses import HealthResponse
from utils.loader import is_model_loaded, preload

# ── Logging ──────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-20s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("astram")


# ── Lifespan (startup/shutdown) ──────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ASTRAM backend …")
    preload()
    logger.info("Startup complete.")
    yield
    logger.info("Shutting down ASTRAM backend.")


# ── App ──────────────────────────────────────────────────────────

app = FastAPI(
    title="ASTRAM",
    description=(
        "Adaptive Street Traffic Risk & Action Monitor — "
        "Backend API for incident impact prediction, recommendation, "
        "event DNA matching, analytics, and drift monitoring."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ── CORS ─────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",         # Next.js dev
        "http://localhost:3001",
        "https://*.vercel.app",          # Vercel deployments
        "*",                             # Allow all during hackathon
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Include Routers ──────────────────────────────────────────────

app.include_router(predict.router)
app.include_router(recommend.router)
app.include_router(dna.router)
app.include_router(analytics.router)
app.include_router(feedback.router)


# ── Health Check ─────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check",
)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=is_model_loaded(),
        version="1.0.0",
    )
