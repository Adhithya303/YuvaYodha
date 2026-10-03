"""API tests for /api/v1/jobs endpoints."""

from fastapi.testclient import TestClient


def test_list_jobs_empty(client: TestClient):
    """Test GET /api/v1/jobs with empty database."""
    response = client.get("/api/v1/jobs")
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_get_job(client: TestClient):
    """Test creating a machine and then scheduling a job on it."""
    # First create machine
    m_payload = {
        "id": "CNC-01",
        "name": "Milling Machine",
        "run_power_kw": 12.0,
        "idle_power_kw": 6.0,
        "standby_power_kw": 1.0,
        "restart_duration_min": 5,
        "restart_energy_kwh": 0.4,
    }
    client.post("/api/v1/machines", json=m_payload)

    # Schedule job
    job_payload = {
        "id": "JOB-001",
        "job_name": "Precision Enclosure Batch 1",
        "product_type": "Precision Enclosure",
        "machine_id": "CNC-01",
        "scheduled_start": 10,
        "duration_min": 45,
        "deadline": 70,
        "status": "QUEUED",
        "quantity": 10,
    }
    response = client.post("/api/v1/jobs", json=job_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == "JOB-001"
    assert data["machine_id"] == "CNC-01"
    assert data["duration_min"] == 45

    # Retrieve single job
    get_res = client.get("/api/v1/jobs/JOB-001")
    assert get_res.status_code == 200
    assert get_res.json()["job_name"] == "Precision Enclosure Batch 1"

    # List jobs
    list_res = client.get("/api/v1/jobs")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1


def test_create_job_invalid_machine(client: TestClient):
    """Test that scheduling a job for a non-existent machine returns 400 Bad Request."""
    job_payload = {
        "id": "JOB-999",
        "job_name": "Orphan Job",
        "product_type": "Type X",
        "machine_id": "NON_EXISTENT_MACHINE",
        "scheduled_start": 20,
        "duration_min": 30,
        "deadline": 60,
        "status": "QUEUED",
        "quantity": 5,
    }
    response = client.post("/api/v1/jobs", json=job_payload)
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]


def test_create_duplicate_job_id(client: TestClient):
    """Test that creating a job with an existing ID returns 409 Conflict."""
    m_payload = {
        "id": "CNC-01",
        "name": "Milling Machine",
        "run_power_kw": 12.0,
        "idle_power_kw": 6.0,
        "standby_power_kw": 1.0,
        "restart_duration_min": 5,
        "restart_energy_kwh": 0.4,
    }
    client.post("/api/v1/machines", json=m_payload)

    job_payload = {
        "id": "JOB-DUP",
        "job_name": "Job 1",
        "machine_id": "CNC-01",
        "scheduled_start": 10,
        "duration_min": 30,
        "deadline": 50,
        "quantity": 1,
    }
    r1 = client.post("/api/v1/jobs", json=job_payload)
    assert r1.status_code == 201

    r2 = client.post("/api/v1/jobs", json=job_payload)
    assert r2.status_code == 409
    assert "already exists" in r2.json()["detail"]


def test_job_validation_errors(client: TestClient):
    """Test validation errors for zero/negative duration or quantity."""
    job_bad_duration = {
        "id": "JOB-BAD-DUR",
        "job_name": "Bad Duration",
        "machine_id": "CNC-01",
        "scheduled_start": 10,
        "duration_min": 0,  # Invalid
        "deadline": 50,
        "quantity": 1,
    }
    r = client.post("/api/v1/jobs", json=job_bad_duration)
    assert r.status_code == 422
