"""Tests for simulation playback service, REST playback frames, and SSE streaming."""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.simulation_run import StrategyType
from app.services.simulation.decision import StrategyConfig
from app.services.simulation_service import run_and_persist_simulation


@pytest.fixture
def idlewise_run(session: Session) -> str:
    """Execute a default IdleWise simulation and return its run_id."""
    result = run_and_persist_simulation(
        session=session,
        scenario_id="default_shift",
        strategy_type=StrategyType.IDLEWISE,
        strategy_config=StrategyConfig(
            fixed_timer_threshold_min=30,
            minimum_saving_kwh=0.10,
            allow_shutdown=True,
        ),
    )
    return result.simulation_run_id


def test_playback_endpoint_structure_and_frame_count(client: TestClient, idlewise_run: str):
    """Verify GET /playback returns 480 frames with 3 machines each."""
    response = client.get(f"/api/v1/simulations/{idlewise_run}/playback")
    assert response.status_code == 200
    data = response.json()

    assert data["run_id"] == idlewise_run
    assert data["strategy"] == "IDLEWISE"
    assert data["total_frames"] == 480
    assert len(data["machines"]) == 3
    assert len(data["frames"]) == 480

    # Inspect first frame
    first_frame = data["frames"][0]
    assert first_frame["minute_index"] == 0
    assert first_frame["simulation_time"] == "08:00"
    assert first_frame["progress_percent"] == 0.2
    assert len(first_frame["machines"]) == 3


def test_final_frame_consistency_with_simulation_result(client: TestClient, idlewise_run: str):
    """Verify final playback frame matches persisted simulation totals exactly."""
    response = client.get(f"/api/v1/simulations/{idlewise_run}/playback")
    assert response.status_code == 200
    data = response.json()

    final_frame = data["frames"][-1]
    assert final_frame["minute_index"] == 479
    assert final_frame["simulation_time"] == "15:59"
    assert final_frame["progress_percent"] == 100.0

    cumulative = final_frame["cumulative"]
    summary = data["final_summary"]

    # Final energy must equal total energy within floating tolerance
    assert abs(cumulative["energy_kwh"] - summary["total_energy_kwh"]) < 1e-3
    assert abs(cumulative["energy_kwh"] - 161.6483) < 0.05
    assert cumulative["jobs_completed"] == 12
    assert cumulative["units_produced"] == 150
    assert summary["production_preserved"] is True
    assert summary["late_jobs"] == 0


def test_playback_decision_count_and_synchronization(client: TestClient, idlewise_run: str):
    """Verify all 9 IdleWise decisions appear at their exact minutes during replay."""
    response = client.get(f"/api/v1/simulations/{idlewise_run}/playback")
    assert response.status_code == 200
    data = response.json()

    # Collect decisions across all frames
    all_decisions = []
    for frame in data["frames"]:
        if frame["decisions"]:
            for d in frame["decisions"]:
                all_decisions.append((frame["minute_index"], d))

    # Exactly 9 decisions expected for default IdleWise
    assert len(all_decisions) == 9

    # Check timestamps match frame minute_index
    for minute_index, d in all_decisions:
        assert d["timestamp"] == minute_index
        assert d["recommended_action"] in ["STANDBY", "SHUTDOWN", "KEEP_READY"]
        assert d["production_risk"] == "LOW"


def test_playback_machine_state_and_factory_power_consistency(client: TestClient, idlewise_run: str):
    """Verify machine power sums to factory power and states follow valid physics."""
    response = client.get(f"/api/v1/simulations/{idlewise_run}/playback")
    assert response.status_code == 200
    data = response.json()

    # Check across various representative minutes: 0, 60, 120, 175, 180, 240, 300, 479
    test_minutes = [0, 60, 120, 175, 180, 240, 300, 479]
    for m in test_minutes:
        frame = data["frames"][m]
        machine_powers = [mach["power_kw"] for mach in frame["machines"]]
        expected_factory_power = round(sum(machine_powers), 2)
        assert abs(frame["cumulative"]["factory_power_kw"] - expected_factory_power) < 1e-2

        # Check machine states are valid enums
        for mach in frame["machines"]:
            assert mach["state"] in ["RUNNING", "IDLE_READY", "STANDBY", "STARTING", "OFF"]
            if mach["state"] == "RUNNING":
                assert mach["active_job_id"] is not None
                assert "Processing" in mach["context_note"]


def test_playback_slice_filtering(client: TestClient, idlewise_run: str):
    """Verify start_minute and end_minute slice filtering."""
    response = client.get(
        f"/api/v1/simulations/{idlewise_run}/playback?start_minute=60&end_minute=120"
    )
    assert response.status_code == 200
    data = response.json()

    assert data["total_frames"] == 61
    assert data["frames"][0]["minute_index"] == 60
    assert data["frames"][-1]["minute_index"] == 120


def test_playback_not_found(client: TestClient):
    """Verify 404 is returned for non-existent simulation run ID."""
    response = client.get("/api/v1/simulations/non-existent-run-id-12345/playback")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_sse_streaming_endpoint(client: TestClient, idlewise_run: str):
    """Verify GET /stream returns text/event-stream with init, frame, and completion events."""
    # Use max speed (240x) to test stream quickly
    response = client.get(
        f"/api/v1/simulations/{idlewise_run}/stream?speed=240"
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")

    # Check content contains event types
    text = response.text
    assert "event: init" in text
    assert "event: frame" in text
    assert "event: completed" in text
    assert "total_energy_kwh" in text


def test_sse_streaming_not_found(client: TestClient):
    """Verify SSE endpoint returns 404 for invalid run ID."""
    response = client.get("/api/v1/simulations/invalid-uuid/stream")
    assert response.status_code == 404
