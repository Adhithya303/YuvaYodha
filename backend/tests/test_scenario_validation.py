"""Unit tests for scenario Feasibility and constraint validation."""

import pytest
from app.services.simulation.scenario import (
    ScenarioDefinition,
    ScenarioMachine,
    ScenarioJob,
    validate_scenario,
    DEFAULT_SHIFT_SCENARIO,
)


def test_default_scenario_validates():
    """Verify that the built-in 8-hour demonstration scenario passes validation."""
    validate_scenario(DEFAULT_SHIFT_SCENARIO)
    assert len(DEFAULT_SHIFT_SCENARIO.machines) == 3
    assert len(DEFAULT_SHIFT_SCENARIO.jobs) == 12
    assert DEFAULT_SHIFT_SCENARIO.shift_minutes == 480


def test_overlapping_jobs_detection():
    """Verify that scheduling two overlapping jobs on the same machine raises ValueError."""
    machines = [
        ScenarioMachine(
            id="M1",
            name="Machine 1",
            run_power_kw=10.0,
            idle_power_kw=5.0,
            standby_power_kw=1.0,
            restart_duration_min=5,
            restart_energy_kwh=0.4,
        )
    ]
    # Job 1: 0 to 45 min, Job 2: 30 to 70 min (Overlaps 30..45)
    jobs = [
        ScenarioJob(
            id="J1",
            job_name="Job 1",
            machine_id="M1",
            scheduled_start=0,
            duration_min=45,
            deadline=60,
        ),
        ScenarioJob(
            id="J2",
            job_name="Job 2",
            machine_id="M1",
            scheduled_start=30,  # Overlaps J1!
            duration_min=40,
            deadline=90,
        ),
    ]
    bad_scenario = ScenarioDefinition(
        id="bad_overlap",
        name="Overlap Scenario",
        shift_minutes=480,
        machines=machines,
        jobs=jobs,
    )
    with pytest.raises(ValueError, match="Job schedule conflict on machine 'M1'"):
        validate_scenario(bad_scenario)


def test_nonexistent_machine_in_job():
    """Verify that referencing an unconfigured machine raises ValueError."""
    machines = [
        ScenarioMachine(
            id="M1",
            name="Machine 1",
            run_power_kw=10.0,
            idle_power_kw=5.0,
            standby_power_kw=1.0,
            restart_duration_min=5,
            restart_energy_kwh=0.4,
        )
    ]
    jobs = [
        ScenarioJob(
            id="J1",
            job_name="Job 1",
            machine_id="NON_EXISTENT_MACHINE",
            scheduled_start=0,
            duration_min=30,
            deadline=60,
        )
    ]
    scenario = ScenarioDefinition(
        id="bad_machine",
        name="Bad Machine Scenario",
        shift_minutes=480,
        machines=machines,
        jobs=jobs,
    )
    with pytest.raises(ValueError, match="references nonexistent machine"):
        validate_scenario(scenario)


def test_job_extends_beyond_shift():
    """Verify that jobs exceeding shift boundary are rejected."""
    machines = [
        ScenarioMachine(
            id="M1",
            name="Machine 1",
            run_power_kw=10.0,
            idle_power_kw=5.0,
            standby_power_kw=1.0,
            restart_duration_min=5,
            restart_energy_kwh=0.4,
        )
    ]
    # Shift is 120 mins, but job starts at 100 with duration 30 (ends at 130)
    jobs = [
        ScenarioJob(
            id="J1",
            job_name="Job 1",
            machine_id="M1",
            scheduled_start=100,
            duration_min=30,
            deadline=140,
        )
    ]
    scenario = ScenarioDefinition(
        id="bad_boundary",
        name="Bad Boundary Scenario",
        shift_minutes=120,
        machines=machines,
        jobs=jobs,
    )
    with pytest.raises(ValueError, match="extends beyond shift boundary"):
        validate_scenario(scenario)
