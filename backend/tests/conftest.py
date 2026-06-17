"""
tests/conftest.py
─────────────────
Shared pytest fixtures for ASTRAM tests.
"""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="module")
def client():
    """FastAPI test client."""
    with TestClient(app) as c:
        yield c
