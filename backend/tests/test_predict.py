"""
tests/test_predict.py
─────────────────────
Unit tests for impact scoring and severity classification.
"""

import pytest

from utils.scoring import compute_impact_score, get_severity_tier


class TestImpactScore:
    def test_zero_duration(self):
        score = compute_impact_score(0)
        assert score == 0.0

    def test_max_duration(self):
        # 48h duration → 50 points from duration alone
        score = compute_impact_score(48)
        assert score == 50.0

    def test_cap_at_48(self):
        # Duration above 48 still caps at 50 for duration component
        s1 = compute_impact_score(48)
        s2 = compute_impact_score(100)
        assert s1 == s2

    def test_closure_adds_25(self):
        base = compute_impact_score(10)
        with_closure = compute_impact_score(10, requires_road_closure=True)
        assert with_closure - base == 25.0

    def test_priority_high_adds_15(self):
        base = compute_impact_score(10, priority="Low")
        with_priority = compute_impact_score(10, priority="High")
        assert with_priority - base == pytest.approx(15.0, abs=0.01)

    def test_planned_event_adds_10(self):
        base = compute_impact_score(10, event_type="unplanned")
        planned = compute_impact_score(10, event_type="planned")
        assert planned - base == pytest.approx(10.0, abs=0.01)

    def test_all_components(self):
        score = compute_impact_score(
            duration_hours=48,
            requires_road_closure=True,
            priority="High",
            event_type="planned",
        )
        assert score == 100.0

    def test_clamped_to_100(self):
        score = compute_impact_score(
            duration_hours=200,
            requires_road_closure=True,
            priority="High",
            event_type="planned",
        )
        assert score == 100.0

    def test_never_negative(self):
        score = compute_impact_score(-5)
        assert score >= 0.0


class TestSeverityTier:
    def test_low(self):
        assert get_severity_tier(0) == "Low"
        assert get_severity_tier(25) == "Low"

    def test_medium(self):
        assert get_severity_tier(26) == "Medium"
        assert get_severity_tier(50) == "Medium"

    def test_high(self):
        assert get_severity_tier(51) == "High"
        assert get_severity_tier(75) == "High"

    def test_critical(self):
        assert get_severity_tier(76) == "Critical"
        assert get_severity_tier(100) == "Critical"
