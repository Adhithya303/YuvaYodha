"""End-to-End benchmark integration and repeatability tests for Prompt 6.

Validates the complete execution pipeline: scenario loading, strategy simulation,
multi-strategy comparison, database persistence, playback generation, final frame integrity,
production preservation guarantee, scenario immutability, and deterministic repeatability.
"""

import pytest
import math
from sqlmodel import Session, select
from app.models.simulation_run import SimulationRun, StrategyType
from app.models.telemetry import Telemetry
from app.models.decision import Decision
from app.services.simulation.scenario import get_scenario, create_overridden_scenario, ScenarioOverrides
from app.services.simulation_service import (
    run_and_persist_simulation,
    compare_simulation_strategies,
    get_simulation_telemetry,
    get_simulation_decisions,
)
from app.services.playback import build_playback_response


def test_full_pipeline_simulation_and_persistence(session: Session):
    """Verify complete lifecycle: Run Always Ready, Fixed Timer, IdleWise, compare, and persist."""
    # 1. Execute full comparison
    cmp_result = compare_simulation_strategies(
        session=session,
        scenario_id="default_shift",
        fixed_timer_threshold_min=30,
        minimum_saving_kwh=0.10,
        allow_shutdown=True,
    )

    c = cmp_result["comparison"]
    assert c["production_preserved"] is True
    assert math.isclose(c["baseline_energy_kwh"], 208.9167, rel_tol=1e-3)
    assert math.isclose(c["fixed_timer_energy_kwh"], 167.9450, rel_tol=1e-3)
    assert math.isclose(c["idlewise_energy_kwh"], 161.6483, rel_tol=1e-3)
    assert math.isclose(c["idlewise_vs_baseline_percent"], 22.62, rel_tol=1e-2)
    assert math.isclose(c["idlewise_vs_fixed_timer_percent"], 3.75, rel_tol=1e-2)

    # 2. Verify Database records persisted
    iw_res = cmp_result["strategies"]["IDLEWISE"]
    db_run = session.get(SimulationRun, iw_res.simulation_run_id)
    assert db_run is not None
    assert db_run.strategy == StrategyType.IDLEWISE
    assert iw_res.total_units_produced == 150
    assert db_run.jobs_completed == 12
    assert db_run.late_jobs == 0

    # 3. Verify Telemetry persistence
    telemetry = get_simulation_telemetry(session, iw_res.simulation_run_id)
    assert len(telemetry) == 1440  # 480 min * 3 machines

    # 4. Verify Decisions persistence
    decisions = get_simulation_decisions(session, iw_res.simulation_run_id)
    assert len(decisions) == 9

    # 5. Verify Playback response and final frame consistency
    playback = build_playback_response(session, iw_res.simulation_run_id)
    assert playback.total_frames == 480
    assert len(playback.machines) == 3
    final_frame = playback.frames[-1]
    assert final_frame.simulation_time == "15:59"
    assert math.isclose(final_frame.cumulative.energy_kwh, iw_res.total_energy_kwh, rel_tol=1e-3)
    assert playback.final_summary["production_preserved"] is True


def test_deterministic_repeatability_across_five_runs(session: Session):
    """Run IdleWise simulation 5 consecutive times and verify identical physical results (Section 75)."""
    scenario = get_scenario("default_shift")
    energies = []
    unit_counts = []
    completed_jobs = []
    decision_counts = []

    for _ in range(5):
        res = run_and_persist_simulation(
            session=session,
            scenario_id="default_shift",
            strategy_type=StrategyType.IDLEWISE,
        )
        energies.append(res.total_energy_kwh)
        unit_counts.append(res.total_units_produced)
        completed_jobs.append(res.jobs_completed)
        decision_counts.append(len(res.decisions))

    # All 5 runs must be strictly identical within floating point tolerance
    for e in energies:
        assert math.isclose(e, energies[0], rel_tol=1e-6)
    assert all(u == 150 for u in unit_counts)
    assert all(j == 12 for j in completed_jobs)
    assert all(d == 9 for d in decision_counts)


def test_scenario_immutability_after_overrides_cycle(session: Session):
    """Confirm default scenario remains identical after multiple What-If overrides (Section 74)."""
    base_scenario = get_scenario("default_shift")
    orig_tariff = base_scenario.electricity_tariff_per_kwh
    orig_shift_min = base_scenario.shift_minutes

    # Create temporary overridden scenario with high tariff and altered threshold
    overrides = ScenarioOverrides(electricity_tariff_per_kwh=18.5)
    custom_scenario = create_overridden_scenario(base_scenario, overrides)

    assert custom_scenario.electricity_tariff_per_kwh == 18.5
    # Verify original in registry was NOT touched
    base_after = get_scenario("default_shift")
    assert base_after.electricity_tariff_per_kwh == orig_tariff
    assert base_after.shift_minutes == orig_shift_min

    # Run simulation on default shift again and verify exact standard benchmark
    res = run_and_persist_simulation(
        session=session,
        scenario_id="default_shift",
        strategy_type=StrategyType.IDLEWISE,
    )
    assert math.isclose(res.total_energy_kwh, 161.6483, rel_tol=1e-3)
    assert res.total_units_produced == 150
