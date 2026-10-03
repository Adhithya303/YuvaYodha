"""API tests for /api/v1/machines endpoints."""

from fastapi.testclient import TestClient


def test_list_machines_empty(client: TestClient):
    """Test GET /api/v1/machines with empty database."""
    response = client.get("/api/v1/machines")
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_get_machine(client: TestClient):
    """Test POST /api/v1/machines and subsequent GET."""
    payload = {
        "id": "CNC-01",
        "name": "CNC Milling Center 1",
        "machine_type": "CNC 3-Axis",
        "run_power_kw": 12.0,
        "idle_power_kw": 6.0,
        "standby_power_kw": 1.0,
        "off_power_kw": 0.1,
        "restart_duration_min": 5,
        "restart_energy_kwh": 0.4,
        "standby_allowed": True,
        "shutdown_allowed": True,
        "minimum_off_time_min": 30,
        "safety_buffer_min": 5,
    }

    # Create machine
    response = client.post("/api/v1/machines", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == "CNC-01"
    assert data["name"] == "CNC Milling Center 1"
    assert data["run_power_kw"] == 12.0

    # Retrieve machine
    get_res = client.get("/api/v1/machines/CNC-01")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "CNC Milling Center 1"

    # List machines
    list_res = client.get("/api/v1/machines")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1


def test_duplicate_machine_id(client: TestClient):
    """Test that creating a machine with an existing ID returns 409 Conflict."""
    payload = {
        "id": "CNC-01",
        "name": "Machine A",
        "run_power_kw": 10.0,
        "idle_power_kw": 5.0,
        "standby_power_kw": 1.0,
        "restart_duration_min": 5,
        "restart_energy_kwh": 0.4,
    }
    r1 = client.post("/api/v1/machines", json=payload)
    assert r1.status_code == 201

    r2 = client.post("/api/v1/machines", json=payload)
    assert r2.status_code == 409
    assert "already exists" in r2.json()["detail"]


def test_get_machine_not_found(client: TestClient):
    """Test GET /api/v1/machines/{id} with non-existent ID."""
    response = client.get("/api/v1/machines/DOES_NOT_EXIST")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_machine_validation_errors(client: TestClient):
    """Test that invalid payload parameters trigger 422 Unprocessable Entity."""
    # Negative power
    payload_bad_power = {
        "id": "BAD-01",
        "name": "Invalid Machine",
        "run_power_kw": -10.0,
        "idle_power_kw": 5.0,
        "standby_power_kw": 1.0,
        "restart_duration_min": 5,
        "restart_energy_kwh": 0.4,
    }
    r1 = client.post("/api/v1/machines", json=payload_bad_power)
    assert r1.status_code == 422

    # Empty name
    payload_empty_name = {
        "id": "BAD-02",
        "name": "   ",
        "run_power_kw": 10.0,
        "idle_power_kw": 5.0,
        "standby_power_kw": 1.0,
        "restart_duration_min": 5,
        "restart_energy_kwh": 0.4,
    }
    r2 = client.post("/api/v1/machines", json=payload_empty_name)
    assert r2.status_code == 422
