"""Integration tests for /api/v1/simulations endpoints."""

from fastapi.testclient import TestClient


def test_get_available_scenarios(client: TestClient):
    """Verify /api/v1/simulations/scenarios returns configured scenarios."""
    response = client.get("/api/v1/simulations/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert isinstance(scenarios, list)
    assert len(scenarios) >= 1
    assert any(s["id"] == "default_shift" for s in scenarios)


def test_run_always_ready_simulation_api(client: TestClient):
    """Test running Always Ready baseline simulation via POST /api/v1/simulations/run."""
    payload = {
        "scenario_id": "default_shift",
        "strategy": "ALWAYS_READY",
    }
    response = client.post("/api/v1/simulations/run", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["strategy"] == "ALWAYS_READY"
    assert data["status"] == "COMPLETED"
    assert data["jobs_completed"] == 12
    assert data["late_jobs"] == 0
    assert data["total_energy_kwh"] > 0
    assert len(data["machine_results"]) == 3
    assert len(data["job_results"]) == 12
    assert len(data["decisions"]) == 9

    run_id = data["simulation_run_id"]

    # Verify run is listed in simulation history
    list_res = client.get("/api/v1/simulations")
    assert list_res.status_code == 200
    runs = list_res.json()
    assert any(r["id"] == run_id for r in runs)

    # Verify single run retrieval
    get_res = client.get(f"/api/v1/simulations/{run_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == run_id
    assert get_res.json()["strategy"] == "ALWAYS_READY"

    # Verify telemetry retrieval: 3 machines * 480 mins = 1440
    telem_res = client.get(f"/api/v1/simulations/{run_id}/telemetry?limit=2000")
    assert telem_res.status_code == 200
    telem_data = telem_res.json()
    assert len(telem_data) == 1440

    # Verify telemetry filtering by machine_id
    cnc1_res = client.get(f"/api/v1/simulations/{run_id}/telemetry?machine_id=CNC-01&limit=1000")
    assert cnc1_res.status_code == 200
    assert len(cnc1_res.json()) == 480


def test_run_fixed_timer_simulation_api(client: TestClient):
    """Verify executing FIXED_TIMER strategy via POST /api/v1/simulations/run."""
    payload = {
        "scenario_id": "default_shift",
        "strategy": "FIXED_TIMER",
        "strategy_config": {
            "fixed_timer_threshold_min": 30,
        },
    }
    response = client.post("/api/v1/simulations/run", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["strategy"] == "FIXED_TIMER"
    assert data["status"] == "COMPLETED"
    assert data["jobs_completed"] == 12
    assert data["late_jobs"] == 0
    assert len(data["decisions"]) == 9
    assert data["number_of_standby_events"] > 0
    assert data["number_of_restart_events"] > 0


def test_run_idlewise_simulation_api(client: TestClient):
    """Verify executing IDLEWISE strategy via POST /api/v1/simulations/run."""
    payload = {
        "scenario_id": "default_shift",
        "strategy": "IDLEWISE",
        "strategy_config": {
            "minimum_saving_kwh": 0.10,
            "allow_shutdown": True,
        },
    }
    response = client.post("/api/v1/simulations/run", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["strategy"] == "IDLEWISE"
    assert data["status"] == "COMPLETED"
    assert data["jobs_completed"] == 12
    assert data["late_jobs"] == 0
    assert len(data["decisions"]) == 9
    assert data["total_energy_kwh"] < 200.0  # Consumes less than 208.92 kWh baseline

    # Verify state energy breakdown
    assert data["running_energy_kwh"] > 0
    assert data["idle_energy_kwh"] > 0
    assert data["restart_energy_kwh"] > 0


def test_get_simulation_decisions_api(client: TestClient):
    """Verify GET /api/v1/simulations/{run_id}/decisions returns persisted decisions."""
    # First run IdleWise simulation
    run_res = client.post("/api/v1/simulations/run", json={
        "scenario_id": "default_shift",
        "strategy": "IDLEWISE",
    })
    assert run_res.status_code == 201
    run_id = run_res.json()["simulation_run_id"]

    # Query all decisions
    decisions_res = client.get(f"/api/v1/simulations/{run_id}/decisions")
    assert decisions_res.status_code == 200
    decisions = decisions_res.json()
    assert len(decisions) == 9

    for d in decisions:
        assert d["simulation_run_id"] == run_id
        assert "machine_id" in d
        assert "recommended_action" in d
        assert "reason" in d
        assert "estimated_energy_saved_kwh" in d

    # Query filtered by machine_id
    cnc1_decisions_res = client.get(f"/api/v1/simulations/{run_id}/decisions?machine_id=CNC-01")
    assert cnc1_decisions_res.status_code == 200
    cnc1_decisions = cnc1_decisions_res.json()
    assert len(cnc1_decisions) == 3
    assert all(d["machine_id"] == "CNC-01" for d in cnc1_decisions)


def test_compare_strategies_api(client: TestClient):
    """Verify POST /api/v1/simulations/compare runs multi-strategy analysis."""
    payload = {
        "scenario_id": "default_shift",
        "fixed_timer_threshold_min": 30,
        "minimum_saving_kwh": 0.10,
        "allow_shutdown": True,
    }
    response = client.post("/api/v1/simulations/compare", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["scenario_id"] == "default_shift"
    assert "strategies" in data
    assert "ALWAYS_READY" in data["strategies"]
    assert "FIXED_TIMER" in data["strategies"]
    assert "IDLEWISE" in data["strategies"]

    cmp = data["comparison"]
    assert cmp["idlewise_vs_baseline_energy_saved_kwh"] > 0
    assert cmp["idlewise_vs_baseline_percent"] > 0
    assert cmp["cost_saved_idlewise_vs_baseline"] > 0
    assert cmp["production_preserved"] is True
    assert cmp["late_job_difference"] == 0
    assert cmp["production_difference_units"] == 0


def test_invalid_scenario_id_returns_404(client: TestClient):
    """Verify requesting an unknown scenario returns 404."""
    response = client.post("/api/v1/simulations/run", json={
        "scenario_id": "nonexistent_scenario",
        "strategy": "ALWAYS_READY",
    })
    assert response.status_code == 404
