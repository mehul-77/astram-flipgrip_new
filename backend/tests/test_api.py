"""
tests/test_api.py
─────────────────
Integration tests for core API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


class TestHealth:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_has_status(self, client):
        data = client.get("/health").json()
        assert data["status"] == "ok"
        assert "model_loaded" in data
        assert "version" in data


class TestPredictEndpoint:
    """Tests for POST /api/predict — requires a trained model."""

    PAYLOAD = {
        "event_cause": "water_logging",
        "corridor": "Mysore Road",
        "priority": "High",
        "requires_road_closure": True,
        "event_type": "unplanned",
    }

    def test_predict_returns_200_or_503(self, client):
        resp = client.post("/api/predict", json=self.PAYLOAD)
        # 200 if model is trained, 503 if not
        assert resp.status_code in (200, 503)

    def test_predict_response_shape(self, client):
        resp = client.post("/api/predict", json=self.PAYLOAD)
        if resp.status_code == 200:
            data = resp.json()
            assert "duration_hours" in data
            assert "impact_score" in data
            assert "severity" in data
            assert "shap_factors" in data
            assert data["severity"] in ("Low", "Medium", "High", "Critical")
            assert 0 <= data["impact_score"] <= 100

    def test_predict_validation_error(self, client):
        # Missing required field 'event_cause'
        resp = client.post("/api/predict", json={"corridor": "Test"})
        assert resp.status_code == 422


class TestAnalyticsEndpoint:
    def test_analytics_returns_200(self, client):
        resp = client.get("/api/analytics")
        assert resp.status_code == 200

    def test_analytics_has_sections(self, client):
        data = client.get("/api/analytics").json()
        assert "corridor_risk" in data
        assert "junction_risk" in data
        assert "hourly_distribution" in data
        assert "monthly_trend" in data
        assert "cascade_stats" in data
        assert "total_events" in data

    def test_analytics_corridors(self, client):
        resp = client.get("/api/analytics/corridors")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestFeedbackEndpoint:
    PAYLOAD = {
        "event_id": "TEST001",
        "predicted_hrs": 12.0,
        "actual_hrs": 18.0,
        "event_cause": "water_logging",
    }

    def test_feedback_returns_200(self, client):
        resp = client.post("/api/feedback", json=self.PAYLOAD)
        assert resp.status_code == 200

    def test_feedback_response_shape(self, client):
        data = client.post("/api/feedback", json=self.PAYLOAD).json()
        assert data["logged"] is True
        assert "drift_pct" in data
        assert data["status"] in ("STABLE", "DRIFTING")

    def test_drift_summary(self, client):
        resp = client.get("/api/feedback/drift")
        assert resp.status_code == 200
        data = resp.json()
        assert "overall_drift_pct" in data
        assert "status" in data
