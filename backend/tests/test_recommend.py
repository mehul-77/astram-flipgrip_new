"""
tests/test_recommend.py
───────────────────────
Unit tests for the recommendation engine.
"""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


class TestRecommendEndpoint:
    BASE_PAYLOAD = {
        "event_cause": "water_logging",
        "corridor": "Mysore Road",
        "impact_score": 84,
        "zone": "South Zone 1",
        "requires_road_closure": True,
        "priority": "High",
        "duration_hours": 16.0,
    }

    def test_returns_200(self, client):
        resp = client.post("/api/recommend", json=self.BASE_PAYLOAD)
        assert resp.status_code == 200

    def test_response_has_officers(self, client):
        data = client.post("/api/recommend", json=self.BASE_PAYLOAD).json()
        assert "officers" in data
        assert isinstance(data["officers"], int)
        assert data["officers"] >= 2

    def test_response_has_barricades(self, client):
        data = client.post("/api/recommend", json=self.BASE_PAYLOAD).json()
        assert "barricade_points" in data
        assert isinstance(data["barricade_points"], list)
        assert len(data["barricade_points"]) > 0

    def test_response_has_diversion(self, client):
        data = client.post("/api/recommend", json=self.BASE_PAYLOAD).json()
        assert "diversion_route" in data
        assert len(data["diversion_route"]) > 0

    def test_response_has_cost(self, client):
        data = client.post("/api/recommend", json=self.BASE_PAYLOAD).json()
        assert "cost_of_delay" in data
        assert data["cost_of_delay"] > 0

    def test_response_has_playbook(self, client):
        data = client.post("/api/recommend", json=self.BASE_PAYLOAD).json()
        assert "playbook" in data
        assert isinstance(data["playbook"], list)
        assert len(data["playbook"]) > 0

    def test_low_impact_fewer_officers(self, client):
        low = self.BASE_PAYLOAD.copy()
        low["impact_score"] = 10
        low["requires_road_closure"] = False
        low["priority"] = "Low"

        high = self.BASE_PAYLOAD.copy()

        low_data = client.post("/api/recommend", json=low).json()
        high_data = client.post("/api/recommend", json=high).json()

        assert low_data["officers"] <= high_data["officers"]

    def test_validation_error_missing_fields(self, client):
        resp = client.post("/api/recommend", json={"corridor": "Test"})
        assert resp.status_code == 422
