"""
routers/dna.py
──────────────
POST /api/dna — Find similar historical incidents using the Event DNA
                (KNN) engine.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from schemas.requests import DNARequest
from schemas.responses import DNAResponse, SimilarEvent
from utils.loader import get_dna_engine

logger = logging.getLogger("astram.dna")

router = APIRouter(prefix="/api", tags=["Event DNA"])


@router.post(
    "/dna",
    response_model=DNAResponse,
    status_code=status.HTTP_200_OK,
    summary="Find similar historical incidents",
    description=(
        "Given event metadata, returns the top-k most similar past "
        "incidents with similarity percentage, resolution time, and "
        "recommended playbook."
    ),
)
async def find_similar(req: DNARequest) -> DNAResponse:
    try:
        engine = get_dna_engine()
    except Exception as e:
        logger.error("DNA engine unavailable: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"DNA engine not available: {e}",
        )

    query = req.model_dump()
    matches = engine.find_similar(query, k=req.k)

    summary = (
        f"{req.event_cause} on {req.corridor} "
        f"(zone={req.zone or 'Unknown'}, priority={req.priority}, hour={req.hour})"
    )

    return DNAResponse(
        query_summary=summary,
        matches=[SimilarEvent(**m) for m in matches],
    )
