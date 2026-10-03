"""Deterministic verification tests for the Always Ready baseline simulation."""

import pytest
from app.models.simulation_run import StrategyType, SimulationStatus
from app.models.telemetry import MachineState
from app.services.simulation.scenario import (
    ScenarioDefinition,
    ScenarioMachine,
    ScenarioJob,
    DEFAULT_SHIFT_SCENARIO,
)
from app.services.simulation.engine import SimulationEngine


def test_small_deterministic_scenario_always_ready():
    """Verify Section 33 specification:

    1 machine (10 kW run, 5 kW idle), 60-min shift.
    Job in first 30 minutes.
    Expected:
    30 min RUNNING, 30 min IDLE_READY.
    Energy = (10 kW * 0.5 h) + (5 kW * 0.5 h) = 5.0 + 2.5 = 7.5 kWh.
    """
    scenario = ScenarioDefinition(
        id="small_test",
        name="Small Verification Shift",
        shift_minutes=60,
        electricity_tariff_per_kwh=8.0,
        machines=[
            ScenarioMachine(
                id="TEST-M1",
                name="Verification Machine",
                run_power_kw=10.0,
                idle_power_kw=5.0,
                standby_power_kw=1.0,
                restart_duration_min=5,
                restart_energy_kwh=0.4,
            )
        ],
        jobs=[
            ScenarioJob(
                id="T-JOB-1",
                job_name="Test Job 30min",
                machine_id="TEST-M1",
                scheduled_start=0,
                duration_min=30,
                deadline=45,
                quantity=10,
            )
        ],
    )

    engine = SimulationEngine(scenario=scenario, strategy_type=StrategyType.ALWAYS_READY)
    result = engine.run()

    # Mathematical assertions
    assert result.status == SimulationStatus.COMPLETED
    assert result.total_energy_kwh == pytest.approx(7.5, rel=1e-6)
    assert result.total_cost == pytest.approx(60.0, rel=1e-6)  # 7.5 kWh * 8.0 INR
    assert result.jobs_completed == 1
    assert result.late_jobs == 0
    assert result.total_delay_minutes == 0
    assert result.total_units_produced == 10
    assert result.energy_per_unit == pytest.approx(0.75, rel=1e-6)

    # Machine state assertions
    m_res = result.machine_results[0]
    assert m_res.minutes_running == 30
    assert m_res.minutes_idle_ready == 30
    assert m_res.minutes_standby == 0
    assert m_res.minutes_starting == 0
    assert m_res.minutes_off == 0
    assert m_res.utilization_percent == pytest.approx(50.0, rel=1e-6)

    # Telemetry assertions: exactly 60 records for 1 machine * 60 minutes
    assert len(result.telemetry_records) == 60


def test_default_shift_always_ready_simulation():
    """Verify default 8-hour shift execution across 3 machines and 12 jobs."""
    engine = SimulationEngine(scenario=DEFAULT_SHIFT_SCENARIO, strategy_type=StrategyType.ALWAYS_READY)
    result = engine.run()

    assert result.status == SimulationStatus.COMPLETED
    assert result.shift_minutes == 480
    assert result.jobs_completed == 12
    assert result.late_jobs == 0
    assert result.total_delay_minutes == 0
    assert result.total_units_produced == 150

    # Under Always Ready baseline, all idle time is spent in IDLE_READY
    for m in result.machine_results:
        assert m.minutes_standby == 0
        assert m.minutes_starting == 0
        assert m.minutes_off == 0
        assert m.minutes_running + m.minutes_idle_ready == 480

    # Telemetry count: 3 machines * 480 minutes = exactly 1440
    assert len(result.telemetry_records) == 1440


def test_simulation_reproducibility():
    """Confirm Section 36 requirement: repeated runs yield exactly identical results."""
    engine1 = SimulationEngine(scenario=DEFAULT_SHIFT_SCENARIO, strategy_type=StrategyType.ALWAYS_READY)
    result1 = engine1.run()

    engine2 = SimulationEngine(scenario=DEFAULT_SHIFT_SCENARIO, strategy_type=StrategyType.ALWAYS_READY)
    result2 = engine2.run()

    assert result1.total_energy_kwh == pytest.approx(result2.total_energy_kwh, rel=1e-9)
    assert result1.total_cost == pytest.approx(result2.total_cost, rel=1e-9)
    assert result1.total_units_produced == result2.total_units_produced
    assert result1.factory_utilization_percent == pytest.approx(result2.factory_utilization_percent, rel=1e-9)

    for m1, m2 in zip(result1.machine_results, result2.machine_results):
        assert m1.energy_kwh == pytest.approx(m2.energy_kwh, rel=1e-9)
        assert m1.minutes_running == m2.minutes_running
        assert m1.minutes_idle_ready == m2.minutes_idle_ready
