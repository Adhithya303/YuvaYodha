"""Tests for health and diagnostic endpoints."""

from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Confirm /api/v1/health returns ok status and database connected."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "IdleWise API"
    assert data["database"] == "connected"
    assert "version" in data


def test_root_endpoint(client: TestClient):
    """Confirm root info endpoint responds with simulation disclaimer."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "disclaimer" in data
    assert "Simulated machine data" in data["disclaimer"]
