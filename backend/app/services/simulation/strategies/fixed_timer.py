"""Fixed Timer strategy implementation.

Strategy B — Fixed Timer:
A conventional time-threshold policy.
If the idle window duration exceeds a configurable threshold (default: 30 minutes),
the machine enters STANDBY at the start of the window and schedules a warmup restart
so it is fully ready before the next scheduled production job.
If the idle window is less than or equal to the threshold, or if standby is not allowed,
or if the window is too short for restart + safety buffer, the machine remains in IDLE_READY.

Fixed Timer evaluates time duration only, NOT machine energy economics (idle power,
standby power, restart energy penalty, or net energy savings).
"""

from typing import List, Any, Optional
from app.models.telemetry import MachineState
from app.models.simulation_run import StrategyType
from app.models.decision import RecommendedAction, ProductionRisk
from app.services.simulation.decision import (
    IdleWindow,
    IdleDecision,
    ReasonCode,
    MachineExecutionPlan,
    StrategyConfig,
)
from app.services.simulation.strategies.base import SimulationStrategy


class FixedTimerStrategy(SimulationStrategy):
    """Conventional threshold-based idle management policy."""

    @property
    def strategy_type(self) -> StrategyType:
        return StrategyType.FIXED_TIMER

    def evaluate_idle_window(
        self,
        machine: Any,
        window: IdleWindow,
        tariff_per_kwh: float = 8.0,
    ) -> IdleDecision:
        """Evaluate an inter-job idle window using a fixed time threshold.

        Decision Rules:
        1. If window duration <= restart_duration + safety_buffer -> KEEP_READY (RESTART_MARGIN_INSUFFICIENT)
        2. If machine does not permit standby -> KEEP_READY (STANDBY_NOT_SUPPORTED)
        3. If window duration > fixed_timer_threshold_min -> STANDBY (FIXED_TIMER_THRESHOLD_EXCEEDED)
        4. Else -> KEEP_READY (FIXED_TIMER_BELOW_THRESHOLD)
        """
        g = window.duration_min
        r = window.restart_duration_min
        b = window.safety_buffer_min
        threshold = self.config.fixed_timer_threshold_min

        keep_ready_energy = float(machine.idle_power_kw) * (float(g) / 60.0)

        # Rule 1: Insufficient time for restart + safety buffer
        if g <= r + b:
            plan = MachineExecutionPlan(
                action=RecommendedAction.KEEP_READY,
                sleep_start=window.start_minute,
                restart_start_minute=None,
                ready_minute=None,
                idle_window_end=window.end_minute,
            )
            return IdleDecision(
                machine_id=machine.id,
                timestamp=window.start_minute,
                idle_window_min=g,
                previous_job_id=window.previous_job_id,
                next_job_id=window.next_job_id,
                next_job_start=window.next_job_start,
                recommended_action=RecommendedAction.KEEP_READY,
                keep_ready_energy_kwh=round(keep_ready_energy, 4),
                standby_energy_kwh=None,
                shutdown_energy_kwh=None,
                selected_energy_kwh=round(keep_ready_energy, 4),
                estimated_energy_saved_kwh=0.0,
                estimated_cost_saved=0.0,
                restart_start_minute=None,
                ready_minute=None,
                production_risk=ProductionRisk.LOW,
                reason_code=ReasonCode.RESTART_MARGIN_INSUFFICIENT,
                reason=(
                    f"Idle window ({g} min) is insufficient for required restart ({r} min) "
                    f"and safety buffer ({b} min). Fixed Timer maintains {machine.name} in IDLE_READY."
                ),
                execution_plan=plan,
            )

        # Rule 2: Machine does not support standby
        if not window.standby_allowed:
            plan = MachineExecutionPlan(
                action=RecommendedAction.KEEP_READY,
                sleep_start=window.start_minute,
                restart_start_minute=None,
                ready_minute=None,
                idle_window_end=window.end_minute,
            )
            return IdleDecision(
                machine_id=machine.id,
                timestamp=window.start_minute,
                idle_window_min=g,
                previous_job_id=window.previous_job_id,
                next_job_id=window.next_job_id,
                next_job_start=window.next_job_start,
                recommended_action=RecommendedAction.KEEP_READY,
                keep_ready_energy_kwh=round(keep_ready_energy, 4),
                standby_energy_kwh=None,
                shutdown_energy_kwh=None,
                selected_energy_kwh=round(keep_ready_energy, 4),
                estimated_energy_saved_kwh=0.0,
                estimated_cost_saved=0.0,
                restart_start_minute=None,
                ready_minute=None,
                production_risk=ProductionRisk.LOW,
                reason_code=ReasonCode.STANDBY_NOT_SUPPORTED,
                reason=f"Machine {machine.name} does not support standby mode. Maintained in IDLE_READY.",
                execution_plan=plan,
            )

        # Rule 3: Window duration exceeds fixed threshold -> enter STANDBY
        if g > threshold:
            standby_duration = g - r - b
            restart_start = window.next_job_start - r - b
            ready_minute = window.next_job_start - b

            standby_energy = (
                (float(machine.standby_power_kw) * float(standby_duration) / 60.0)
                + float(machine.restart_energy_kwh)
                + (float(machine.idle_power_kw) * float(b) / 60.0)
            )
            energy_saved = max(0.0, keep_ready_energy - standby_energy)
            cost_saved = energy_saved * tariff_per_kwh

            plan = MachineExecutionPlan(
                action=RecommendedAction.STANDBY,
                sleep_start=window.start_minute,
                restart_start_minute=restart_start,
                ready_minute=ready_minute,
                idle_window_end=window.end_minute,
            )

            return IdleDecision(
                machine_id=machine.id,
                timestamp=window.start_minute,
                idle_window_min=g,
                previous_job_id=window.previous_job_id,
                next_job_id=window.next_job_id,
                next_job_start=window.next_job_start,
                recommended_action=RecommendedAction.STANDBY,
                keep_ready_energy_kwh=round(keep_ready_energy, 4),
                standby_energy_kwh=round(standby_energy, 4),
                shutdown_energy_kwh=None,
                selected_energy_kwh=round(standby_energy, 4),
                estimated_energy_saved_kwh=round(energy_saved, 4),
                estimated_cost_saved=round(cost_saved, 2),
                restart_start_minute=restart_start,
                ready_minute=ready_minute,
                production_risk=ProductionRisk.LOW,
                reason_code=ReasonCode.FIXED_TIMER_THRESHOLD_EXCEEDED,
                reason=(
                    f"Fixed Timer threshold ({threshold} min) exceeded by {g} min idle window. "
                    f"Transition to STANDBY for {standby_duration} min. Restart scheduled at minute {restart_start} "
                    f"({r} min duration) reaching ready state at minute {ready_minute} ({b} min safety buffer). "
                    f"Estimated energy: {standby_energy:.2f} kWh (Saving: {energy_saved:.2f} kWh, ₹{cost_saved:.2f})."
                ),
                execution_plan=plan,
            )

        # Rule 4: Window duration <= threshold -> remain in IDLE_READY
        plan = MachineExecutionPlan(
            action=RecommendedAction.KEEP_READY,
            sleep_start=window.start_minute,
            restart_start_minute=None,
            ready_minute=None,
            idle_window_end=window.end_minute,
        )
        return IdleDecision(
            machine_id=machine.id,
            timestamp=window.start_minute,
            idle_window_min=g,
            previous_job_id=window.previous_job_id,
            next_job_id=window.next_job_id,
            next_job_start=window.next_job_start,
            recommended_action=RecommendedAction.KEEP_READY,
            keep_ready_energy_kwh=round(keep_ready_energy, 4),
            standby_energy_kwh=None,
            shutdown_energy_kwh=None,
            selected_energy_kwh=round(keep_ready_energy, 4),
            estimated_energy_saved_kwh=0.0,
            estimated_cost_saved=0.0,
            restart_start_minute=None,
            ready_minute=None,
            production_risk=ProductionRisk.LOW,
            reason_code=ReasonCode.FIXED_TIMER_BELOW_THRESHOLD,
            reason=(
                f"Idle window of {g} min does not exceed Fixed Timer threshold of {threshold} min. "
                f"Machine {machine.name} remains in IDLE_READY consuming {keep_ready_energy:.2f} kWh."
            ),
            execution_plan=plan,
        )

    def decide_machine_state(
        self,
        machine: Any,
        runtime_state: Any,
        current_step: int,
        upcoming_jobs: List[Any],
    ) -> MachineState:
        """Step-level state resolution following execution plan."""
        if runtime_state.active_job_id is not None:
            return MachineState.RUNNING

        plan: Optional[MachineExecutionPlan] = getattr(runtime_state, "current_plan", None)
        if plan is not None and plan.action == RecommendedAction.STANDBY:
            if plan.restart_start_minute is not None and current_step >= plan.restart_start_minute:
                if plan.ready_minute is not None and current_step >= plan.ready_minute:
                    return MachineState.IDLE_READY
                return MachineState.STARTING
            return MachineState.STANDBY

        return MachineState.IDLE_READY
