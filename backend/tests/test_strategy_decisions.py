"""Unit tests for strategy decision logic, energy mathematics, and safety constraints.

Covers Prompt 3 Sections:
- Section 38: Restart energy model exactness
- Section 39: Standby energy calculation test
- Section 40: Short gap test (RESTART_MARGIN_INSUFFICIENT)
- Section 41: No saving break-even test (NO_MEANINGFUL_ENERGY_SAVING)
- Section 42: Standby not supported test
- Section 43: Shutdown candidate selection
- Section 44: Shutdown rejection by minimum off-time
- Section 45: Fixed timer threshold behavior
"""

import pytest
from app.models.decision import RecommendedAction
from app.models.telemetry import MachineState
from app.services.simulation.decision import (
    IdleWindow,
    ReasonCode,
    StrategyConfig,
)
from app.services.simulation.scenario import ScenarioMachine
from app.services.simulation.energy import get_machine_power_kw, calculate_step_energy_kwh
from app.services.simulation.strategies.fixed_timer import FixedTimerStrategy
from app.services.simulation.strategies.idlewise import IdleWiseStrategy


# ==============================================================================
# SECTION 38: RESTART ENERGY MODEL TEST
# ==============================================================================

def test_restart_energy_model_exactness():
    """Verify Section 38:

    Machine has restart_energy_kwh = 0.5, restart_duration_min = 5.
    Derived power = 0.5 / (5/60) = 6.0 kW.
    5 minutes in STARTING state must accumulate exactly 0.5 kWh.
    """
    m = ScenarioMachine(
        id="TEST-RESTART",
        name="Restart Verification Machine",
        run_power_kw=10.0,
        idle_power_kw=4.0,
        standby_power_kw=1.0,
        restart_duration_min=5,
        restart_energy_kwh=0.5,
    )

    power = get_machine_power_kw(m, MachineState.STARTING)
    assert power == pytest.approx(6.0, rel=1e-9)

    # 5 steps of 1 minute at 6 kW
    total_restart_energy = sum(calculate_step_energy_kwh(power, 1.0) for _ in range(5))
    assert total_restart_energy == pytest.approx(0.5, rel=1e-9)


# ==============================================================================
# SECTION 39: STANDBY ENERGY UNIT TEST
# ==============================================================================

def test_standby_energy_unit_calculation():
    """Verify Section 39:

    Idle window: 60 min
    Idle power: 6 kW
    Standby power: 1 kW
    Restart duration: 5 min
    Restart energy: 0.4 kWh
    Safety buffer: 5 min

    KEEP_READY: 6 * 1h = 6.0 kWh
    Standby duration: 60 - 5 - 5 = 50 min
    Standby energy: 1 kW * (50/60)h = 0.8333... kWh
    Restart: 0.4 kWh
    Safety buffer: 6 kW * (5/60)h = 0.5 kWh
    Total Standby Plan Energy: 0.8333... + 0.4 + 0.5 = 1.7333... kWh
    Expected Saving: 6.0 - 1.7333... = 4.2667... kWh
    """
    m = ScenarioMachine(
        id="M-STANDBY-TEST",
        name="Standby Test Machine",
        run_power_kw=12.0,
        idle_power_kw=6.0,
        standby_power_kw=1.0,
        restart_duration_min=5,
        restart_energy_kwh=0.4,
        standby_allowed=True,
        shutdown_allowed=False,
        safety_buffer_min=5,
    )

    window = IdleWindow(
        machine_id=m.id,
        start_minute=0,
        end_minute=60,
        duration_min=60,
        previous_job_id="J-PREV",
        next_job_id="J-NEXT",
        next_job_start=60,
        restart_duration_min=m.restart_duration_min,
        safety_buffer_min=m.safety_buffer_min,
        standby_allowed=m.standby_allowed,
        shutdown_allowed=m.shutdown_allowed,
        minimum_off_time_min=m.minimum_off_time_min,
    )

    strategy = IdleWiseStrategy()
    decision = strategy.evaluate_idle_window(machine=m, window=window, tariff_per_kwh=8.0)

    assert decision.recommended_action == RecommendedAction.STANDBY
    assert decision.keep_ready_energy_kwh == pytest.approx(6.0, rel=1e-4)
    assert decision.selected_energy_kwh == pytest.approx(1.7333, rel=1e-3)
    assert decision.estimated_energy_saved_kwh == pytest.approx(4.2667, rel=1e-3)
    assert decision.reason_code == ReasonCode.STANDBY_LOWEST_ENERGY
    assert decision.restart_start_minute == 50  # 60 - 5 - 5
    assert decision.ready_minute == 55          # 60 - 5


# ==============================================================================
# SECTION 40: SHORT GAP TEST
# ==============================================================================

def test_short_gap_insufficient_restart_margin():
    """Verify Section 40:

    Idle window: 8 min
    Restart duration: 5 min
    Buffer: 5 min
    Since 8 <= 10, IdleWise must KEEP_READY with RESTART_MARGIN_INSUFFICIENT.
    """
    m = ScenarioMachine(
        id="M-SHORT",
        name="Short Gap Machine",
        run_power_kw=12.0,
        idle_power_kw=6.0,
        standby_power_kw=1.0,
        restart_duration_min=5,
        restart_energy_kwh=0.4,
        standby_allowed=True,
        shutdown_allowed=True,
        safety_buffer_min=5,
    )

    window = IdleWindow(
        machine_id=m.id,
        start_minute=20,
        end_minute=28,
        duration_min=8,
        previous_job_id="J1",
        next_job_id="J2",
        next_job_start=28,
        restart_duration_min=m.restart_duration_min,
        safety_buffer_min=m.safety_buffer_min,
        standby_allowed=m.standby_allowed,
        shutdown_allowed=m.shutdown_allowed,
        minimum_off_time_min=m.minimum_off_time_min,
    )

    strategy = IdleWiseStrategy()
    decision = strategy.evaluate_idle_window(machine=m, window=window, tariff_per_kwh=8.0)

    assert decision.recommended_action == RecommendedAction.KEEP_READY
    assert decision.reason_code == ReasonCode.RESTART_MARGIN_INSUFFICIENT
    assert decision.estimated_energy_saved_kwh == 0.0


# ==============================================================================
# SECTION 41: NO SAVING TEST
# ==============================================================================

def test_no_meaningful_saving_keeps_ready():
    """Verify Section 41:

    Machine has low idle power (1.0 kW) and high restart energy (2.0 kWh).
    For a 20-min window (R=5, B=5, available standby=10 min):
    E_keep = 1.0 * 20/60 = 0.333 kWh
    E_standby = 0.5 * 10/60 + 2.0 + 1.0 * 5/60 = 0.083 + 2.0 + 0.083 = 2.167 kWh
    Standby loses 1.83 kWh!
    IdleWise must select KEEP_READY with NO_MEANINGFUL_ENERGY_SAVING.
    """
    m = ScenarioMachine(
        id="M-NO-SAVE",
        name="High Penalty Machine",
        run_power_kw=5.0,
        idle_power_kw=1.0,
        standby_power_kw=0.5,
        restart_duration_min=5,
        restart_energy_kwh=2.0,
        standby_allowed=True,
        shutdown_allowed=False,
        safety_buffer_min=5,
    )

    window = IdleWindow(
        machine_id=m.id,
        start_minute=10,
        end_minute=30,
        duration_min=20,
        previous_job_id="J1",
        next_job_id="J2",
        next_job_start=30,
        restart_duration_min=m.restart_duration_min,
        safety_buffer_min=m.safety_buffer_min,
        standby_allowed=m.standby_allowed,
        shutdown_allowed=m.shutdown_allowed,
        minimum_off_time_min=m.minimum_off_time_min,
    )

    strategy = IdleWiseStrategy(config=StrategyConfig(minimum_saving_kwh=0.10))
    decision = strategy.evaluate_idle_window(machine=m, window=window, tariff_per_kwh=8.0)

    assert decision.recommended_action == RecommendedAction.KEEP_READY
    assert decision.reason_code == ReasonCode.NO_MEANINGFUL_ENERGY_SAVING
    assert decision.estimated_energy_saved_kwh == 0.0


# ==============================================================================
# SECTION 42: STANDBY NOT SUPPORTED TEST
# ==============================================================================

def test_standby_not_supported():
    """Verify Section 42:

    If standby_allowed is False and shutdown_allowed is False, IdleWise must NEVER
    recommend STANDBY or SHUTDOWN.
    """
    m = ScenarioMachine(
        id="M-NO-STANDBY",
        name="No Standby Machine",
        run_power_kw=10.0,
        idle_power_kw=5.0,
        standby_power_kw=1.0,
        restart_duration_min=5,
        restart_energy_kwh=0.4,
        standby_allowed=False,
        shutdown_allowed=False,
        safety_buffer_min=5,
    )

    window = IdleWindow(
        machine_id=m.id,
        start_minute=0,
        end_minute=60,
        duration_min=60,
        previous_job_id="J1",
        next_job_id="J2",
        next_job_start=60,
        restart_duration_min=m.restart_duration_min,
        safety_buffer_min=m.safety_buffer_min,
        standby_allowed=m.standby_allowed,
        shutdown_allowed=m.shutdown_allowed,
        minimum_off_time_min=m.minimum_off_time_min,
    )

    strategy = IdleWiseStrategy()
    decision = strategy.evaluate_idle_window(machine=m, window=window)

    assert decision.recommended_action == RecommendedAction.KEEP_READY
    assert decision.reason_code == ReasonCode.STANDBY_NOT_SUPPORTED


# ==============================================================================
# SECTION 43: SHUTDOWN SELECTION TEST
# ==============================================================================

def test_shutdown_selected_when_safe_and_superior():
    """Verify Section 43:

    Long idle gap (90 min), shutdown_allowed=True, min_off_time=30 min.
    Off power (0.1 kW) is substantially lower than Standby power (1.5 kW).
    Available off duration: 90 - 7 - 5 = 78 min >= 30 min.
    IdleWise selects SHUTDOWN with SHUTDOWN_LOWEST_ENERGY.
    """
    m = ScenarioMachine(
        id="M-SHUTDOWN",
        name="Shutdown Eligible Machine",
        run_power_kw=16.0,
        idle_power_kw=8.0,
        standby_power_kw=1.5,
        off_power_kw=0.1,
        restart_duration_min=7,
        restart_energy_kwh=0.6,
        standby_allowed=True,
        shutdown_allowed=True,
        minimum_off_time_min=30,
        safety_buffer_min=5,
    )

    window = IdleWindow(
        machine_id=m.id,
        start_minute=0,
        end_minute=90,
        duration_min=90,
        previous_job_id="J1",
        next_job_id="J2",
        next_job_start=90,
        restart_duration_min=m.restart_duration_min,
        safety_buffer_min=m.safety_buffer_min,
        standby_allowed=m.standby_allowed,
        shutdown_allowed=m.shutdown_allowed,
        minimum_off_time_min=m.minimum_off_time_min,
    )

    strategy = IdleWiseStrategy(config=StrategyConfig(allow_shutdown=True))
    decision = strategy.evaluate_idle_window(machine=m, window=window)

    assert decision.recommended_action == RecommendedAction.SHUTDOWN
    assert decision.reason_code == ReasonCode.SHUTDOWN_LOWEST_ENERGY
    assert decision.shutdown_energy_kwh < decision.standby_energy_kwh


# ==============================================================================
# SECTION 44: SHUTDOWN REJECTION BY MINIMUM OFF TIME
# ==============================================================================

def test_shutdown_rejected_when_minimum_off_time_violated():
    """Verify Section 44:

    Idle gap: 35 min (R=5, B=5).
    Available off duration: 35 - 10 = 25 min.
    Machine requires minimum_off_time_min = 40 min.
    Even though shutdown_allowed is True and off power is 0.1 kW,
    SHUTDOWN must be rejected because 25 < 40.
    IdleWise should select STANDBY instead.
    """
    m = ScenarioMachine(
        id="M-REJECT-SHUTDOWN",
        name="Strict Min Off Time Machine",
        run_power_kw=12.0,
        idle_power_kw=6.0,
        standby_power_kw=1.0,
        off_power_kw=0.1,
        restart_duration_min=5,
        restart_energy_kwh=0.4,
        standby_allowed=True,
        shutdown_allowed=True,
        minimum_off_time_min=40,  # 25 min available < 40 min required
        safety_buffer_min=5,
    )

    window = IdleWindow(
        machine_id=m.id,
        start_minute=0,
        end_minute=35,
        duration_min=35,
        previous_job_id="J1",
        next_job_id="J2",
        next_job_start=35,
        restart_duration_min=m.restart_duration_min,
        safety_buffer_min=m.safety_buffer_min,
        standby_allowed=m.standby_allowed,
        shutdown_allowed=m.shutdown_allowed,
        minimum_off_time_min=m.minimum_off_time_min,
    )

    strategy = IdleWiseStrategy(config=StrategyConfig(allow_shutdown=True))
    decision = strategy.evaluate_idle_window(machine=m, window=window)

    assert decision.recommended_action == RecommendedAction.STANDBY
    assert decision.reason_code == ReasonCode.STANDBY_LOWEST_ENERGY
    assert decision.shutdown_energy_kwh is None  # Shutdown was not viable


# ==============================================================================
# SECTION 45: FIXED TIMER THRESHOLD TEST
# ==============================================================================

def test_fixed_timer_threshold_behavior():
    """Verify Section 45:

    Default threshold: 30 minutes.
    Window 20 min <= 30 min -> KEEP_READY (FIXED_TIMER_BELOW_THRESHOLD).
    Window 45 min > 30 min -> STANDBY (FIXED_TIMER_THRESHOLD_EXCEEDED).
    """
    m = ScenarioMachine(
        id="M-TIMER",
        name="Timer Test Machine",
        run_power_kw=10.0,
        idle_power_kw=5.0,
        standby_power_kw=1.0,
        restart_duration_min=5,
        restart_energy_kwh=0.4,
        standby_allowed=True,
        safety_buffer_min=5,
    )

    strategy = FixedTimerStrategy(config=StrategyConfig(fixed_timer_threshold_min=30))

    # Case A: 20 min gap (below threshold)
    w_below = IdleWindow(
        machine_id=m.id,
        start_minute=0,
        end_minute=20,
        duration_min=20,
        previous_job_id="J1",
        next_job_id="J2",
        next_job_start=20,
        restart_duration_min=m.restart_duration_min,
        safety_buffer_min=m.safety_buffer_min,
        standby_allowed=m.standby_allowed,
        shutdown_allowed=False,
        minimum_off_time_min=0,
    )
    d_below = strategy.evaluate_idle_window(machine=m, window=w_below)
    assert d_below.recommended_action == RecommendedAction.KEEP_READY
    assert d_below.reason_code == ReasonCode.FIXED_TIMER_BELOW_THRESHOLD

    # Case B: 45 min gap (above threshold)
    w_above = IdleWindow(
        machine_id=m.id,
        start_minute=0,
        end_minute=45,
        duration_min=45,
        previous_job_id="J1",
        next_job_id="J2",
        next_job_start=45,
        restart_duration_min=m.restart_duration_min,
        safety_buffer_min=m.safety_buffer_min,
        standby_allowed=m.standby_allowed,
        shutdown_allowed=False,
        minimum_off_time_min=0,
    )
    d_above = strategy.evaluate_idle_window(machine=m, window=w_above)
    assert d_above.recommended_action == RecommendedAction.STANDBY
    assert d_above.reason_code == ReasonCode.FIXED_TIMER_THRESHOLD_EXCEEDED
    assert d_above.restart_start_minute == 35  # 45 - 5 - 5
    assert d_above.ready_minute == 40          # 45 - 5
