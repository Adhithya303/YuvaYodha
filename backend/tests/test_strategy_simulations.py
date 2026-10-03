"""Simulation verification tests covering full shift execution, telemetry state sequences,
production safety preservation, and benchmark scenarios.

Covers Prompt 3 Sections:
- Section 46: Decision count test
- Section 47: Production safety test
- Section 48: Baseline regression test
- Section 49: Telemetry state sequences
- Section 50: Decision persistence in SQLite
- Section 37: Dedicated benchmark scenario evaluations
"""

import pytest
from sqlmodel import Session, select
from app.models.simulation_run import StrategyType, SimulationStatus
from app.models.telemetry import MachineState
from app.models.decision import Decision, RecommendedAction
from app.services.simulation.scenario import (
    DEFAULT_SHIFT_SCENARIO,
    SCENARIO_SHORT_GAP,
    SCENARIO_MEDIUM_GAP,
    SCENARIO_LONG_GAP,
    SCENARIO_HIGH_RESTART_ENERGY,
)
from app.services.simulation.engine import SimulationEngine
from app.services.simulation.decision import StrategyConfig
from app.services.simulation_service import run_and_persist_simulation


# ==============================================================================
# SECTION 48: BASELINE REGRESSION TEST
# ==============================================================================

def test_always_ready_baseline_regression():
    """Verify Section 48:

    After Prompt 3 implementation, running ALWAYS_READY on default_shift
    must still produce the exact Prompt 2 baseline:
    - Total Energy: ~208.9167 kWh
    - Completed Jobs: 12 / 12
    - Units Produced: 150
    - Late Jobs: 0
    - Machine Breakdown:
      CNC-01: 66.00 kWh (180 min run, 300 min idle)
      CNC-02: 91.333 kWh (205 min run, 275 min idle)
      CNC-03: 51.583 kWh (170 min run, 310 min idle)
    """
    engine = SimulationEngine(scenario=DEFAULT_SHIFT_SCENARIO, strategy_type=StrategyType.ALWAYS_READY)
    result = engine.run()

    assert result.status == SimulationStatus.COMPLETED
    assert result.total_energy_kwh == pytest.approx(208.916666667, rel=1e-5)
    assert result.total_cost == pytest.approx(1671.33333333, rel=1e-4)
    assert result.total_units_produced == 150
    assert result.jobs_completed == 12
    assert result.late_jobs == 0
    assert result.total_delay_minutes == 0

    m_by_id = {m.machine_id: m for m in result.machine_results}
    assert m_by_id["CNC-01"].energy_kwh == pytest.approx(66.00, rel=1e-4)
    assert m_by_id["CNC-01"].minutes_running == 180
    assert m_by_id["CNC-01"].minutes_idle_ready == 300

    assert m_by_id["CNC-02"].energy_kwh == pytest.approx(91.333333, rel=1e-4)
    assert m_by_id["CNC-02"].minutes_running == 205
    assert m_by_id["CNC-02"].minutes_idle_ready == 275

    assert m_by_id["CNC-03"].energy_kwh == pytest.approx(51.583333, rel=1e-4)
    assert m_by_id["CNC-03"].minutes_running == 170
    assert m_by_id["CNC-03"].minutes_idle_ready == 310


# ==============================================================================
# SECTION 46: DECISION COUNT TEST
# ==============================================================================

def test_decision_count_one_per_eligible_window():
    """Verify Section 46:

    In the default shift, each machine has exactly 4 scheduled jobs, resulting in:
    3 inter-job idle windows per machine.
    Across 3 machines, exactly 9 primary decisions must be generated.
    Not 1440 minute-level decisions!
    """
    for strategy in [StrategyType.ALWAYS_READY, StrategyType.FIXED_TIMER, StrategyType.IDLEWISE]:
        engine = SimulationEngine(scenario=DEFAULT_SHIFT_SCENARIO, strategy_type=strategy)
        result = engine.run()

        assert len(result.decisions) == 9

        decisions_by_machine = {}
        for d in result.decisions:
            decisions_by_machine.setdefault(d.machine_id, []).append(d)

        assert len(decisions_by_machine["CNC-01"]) == 3
        assert len(decisions_by_machine["CNC-02"]) == 3
        assert len(decisions_by_machine["CNC-03"]) == 3


# ==============================================================================
# SECTION 47: PRODUCTION SAFETY TEST
# ==============================================================================

def test_production_safety_across_all_strategies():
    """Verify Section 47:

    All strategies must strictly preserve required production:
    - Same total units produced (150)
    - Same completed jobs (12)
    - Zero late jobs under IdleWise
    - Zero total delay minutes
    """
    res_ar = SimulationEngine(DEFAULT_SHIFT_SCENARIO, StrategyType.ALWAYS_READY).run()
    res_ft = SimulationEngine(DEFAULT_SHIFT_SCENARIO, StrategyType.FIXED_TIMER).run()
    res_iw = SimulationEngine(DEFAULT_SHIFT_SCENARIO, StrategyType.IDLEWISE).run()

    # Units produced identical
    assert res_ar.total_units_produced == 150
    assert res_ft.total_units_produced == 150
    assert res_iw.total_units_produced == 150

    # Jobs completed identical
    assert res_ar.jobs_completed == 12
    assert res_ft.jobs_completed == 12
    assert res_iw.jobs_completed == 12

    # Zero late jobs
    assert res_ar.late_jobs == 0
    assert res_ft.late_jobs == 0
    assert res_iw.late_jobs == 0

    assert res_ar.total_delay_minutes == 0
    assert res_ft.total_delay_minutes == 0
    assert res_iw.total_delay_minutes == 0


# ==============================================================================
# SECTION 49: TELEMETRY STATE SEQUENCES TEST
# ==============================================================================

def test_telemetry_state_sequences():
    """Verify Section 49:

    ALWAYS_READY: Telemetry states are only RUNNING and IDLE_READY.
    FIXED_TIMER: Telemetry includes STANDBY, STARTING, IDLE_READY, RUNNING.
    IDLEWISE: Telemetry includes STANDBY, OFF, STARTING, IDLE_READY, RUNNING.
    """
    res_ar = SimulationEngine(DEFAULT_SHIFT_SCENARIO, StrategyType.ALWAYS_READY).run()
    states_ar = set(t["machine_state"] for t in res_ar.telemetry_records)
    assert states_ar == {MachineState.RUNNING, MachineState.IDLE_READY}

    res_ft = SimulationEngine(DEFAULT_SHIFT_SCENARIO, StrategyType.FIXED_TIMER).run()
    states_ft = set(t["machine_state"] for t in res_ft.telemetry_records)
    assert MachineState.STANDBY in states_ft
    assert MachineState.STARTING in states_ft
    assert MachineState.RUNNING in states_ft
    assert MachineState.IDLE_READY in states_ft

    res_iw = SimulationEngine(DEFAULT_SHIFT_SCENARIO, StrategyType.IDLEWISE).run()
    states_iw = set(t["machine_state"] for t in res_iw.telemetry_records)
    assert MachineState.STANDBY in states_iw
    assert MachineState.OFF in states_iw
    assert MachineState.STARTING in states_iw
    assert MachineState.RUNNING in states_iw
    assert MachineState.IDLE_READY in states_iw


# ==============================================================================
# SECTION 50: DECISION PERSISTENCE TEST
# ==============================================================================

def test_decision_persistence_in_database(session: Session):
    """Verify Section 50:

    Executing run_and_persist_simulation persists Decision records to SQLite.
    Querying the decisions table verifies 9 rows matching the run_id.
    """
    result = run_and_persist_simulation(
        session=session,
        scenario_id="default_shift",
        strategy_type=StrategyType.IDLEWISE,
    )

    persisted_decisions = session.exec(
        select(Decision).where(Decision.simulation_run_id == result.simulation_run_id)
    ).all()

    assert len(persisted_decisions) == 9
    for d in persisted_decisions:
        assert d.simulation_run_id == result.simulation_run_id
        assert d.machine_id in ("CNC-01", "CNC-02", "CNC-03")
        assert d.recommended_action in (RecommendedAction.STANDBY, RecommendedAction.SHUTDOWN)
        assert d.estimated_energy_saved_kwh > 0.0


# ==============================================================================
# SECTION 37: BENCHMARK SCENARIO VERIFICATION TESTS
# ==============================================================================

def test_benchmark_scenario_short_gap():
    """Verify short gap scenario: 8 min gap <= 10 min margin -> KEEP_READY."""
    engine = SimulationEngine(SCENARIO_SHORT_GAP, StrategyType.IDLEWISE)
    result = engine.run()

    assert len(result.decisions) == 1
    d = result.decisions[0]
    assert d.recommended_action == RecommendedAction.KEEP_READY
    assert d.reason_code == "RESTART_MARGIN_INSUFFICIENT"
    assert result.late_jobs == 0
    assert result.total_units_produced == 10


def test_benchmark_scenario_medium_gap():
    """Verify medium gap scenario: 45 min gap -> STANDBY selected."""
    engine = SimulationEngine(SCENARIO_MEDIUM_GAP, StrategyType.IDLEWISE)
    result = engine.run()

    assert len(result.decisions) == 1
    d = result.decisions[0]
    assert d.recommended_action == RecommendedAction.STANDBY
    assert d.estimated_energy_saved_kwh > 0.0
    assert result.late_jobs == 0


def test_benchmark_scenario_long_gap():
    """Verify long gap scenario: 90 min gap with min_off=30 min -> SHUTDOWN selected."""
    engine = SimulationEngine(SCENARIO_LONG_GAP, StrategyType.IDLEWISE)
    result = engine.run()

    assert len(result.decisions) == 1
    d = result.decisions[0]
    assert d.recommended_action == RecommendedAction.SHUTDOWN
    assert d.reason_code == "SHUTDOWN_LOWEST_ENERGY"
    assert result.late_jobs == 0


def test_benchmark_scenario_high_restart_energy():
    """Verify high restart penalty scenario:

    Fixed timer (threshold 30) chooses STANDBY for 40-min gap, wasting energy.
    IdleWise recognizes negative savings and chooses KEEP_READY!
    """
    res_ft = SimulationEngine(SCENARIO_HIGH_RESTART_ENERGY, StrategyType.FIXED_TIMER).run()
    res_iw = SimulationEngine(SCENARIO_HIGH_RESTART_ENERGY, StrategyType.IDLEWISE).run()

    assert res_ft.decisions[0].recommended_action == RecommendedAction.STANDBY
    assert res_iw.decisions[0].recommended_action == RecommendedAction.KEEP_READY
    assert res_iw.decisions[0].reason_code == "NO_MEANINGFUL_ENERGY_SAVING"

    # IdleWise uses LESS energy than Fixed Timer here!
    assert res_iw.total_energy_kwh < res_ft.total_energy_kwh
