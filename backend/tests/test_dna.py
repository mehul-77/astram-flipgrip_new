"""
tests/test_dna.py
─────────────────
Tests for the Event DNA (KNN similar event) endpoint.
"""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


class TestDNAEndpoint:
    PAYLOAD = {
        "event_cause": "water_logging",
        "corridor": "Mysore Road",
        "zone": "South Zone 1",
        "priority": "High",
        "requires_road_closure": False,
        "hour": 14,
        "k": 3,
    }

    def test_returns_200(self, client):
        resp = client.post("/api/dna", json=self.PAYLOAD)
        assert resp.status_code == 200

    def test_response_has_matches(self, client):
        data = client.post("/api/dna", json=self.PAYLOAD).json()
        assert "matches" in data
        assert isinstance(data["matches"], list)

    def test_matches_have_similarity(self, client):
        data = client.post("/api/dna", json=self.PAYLOAD).json()
        if data["matches"]:
            match = data["matches"][0]
            assert "similarity_pct" in match
            assert 0 <= match["similarity_pct"] <= 100
            assert "event_cause" in match
            assert "resolution_hrs" in match
            assert "playbook" in match

    def test_k_parameter(self, client):
        payload = self.PAYLOAD.copy()
        payload["k"] = 5
        data = client.post("/api/dna", json=payload).json()
        assert len(data["matches"]) <= 5

    def test_query_summary(self, client):
        data = client.post("/api/dna", json=self.PAYLOAD).json()
        assert "query_summary" in data
        assert "water_logging" in data["query_summary"]

    def test_validation_error(self, client):
        resp = client.post("/api/dna", json={"corridor": "Test"})
        assert resp.status_code == 422
