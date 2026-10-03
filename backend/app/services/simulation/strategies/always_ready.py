"""Always Ready baseline strategy implementation.

Strategy A — Always Ready:
When a machine is actively executing a production job, it is RUNNING.
When not executing a job, it remains continuously in IDLE_READY state,
consuming idle standby power to stay ready for incoming jobs.
No standby or power-off transitions are ever initiated.
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


class AlwaysReadyStrategy(SimulationStrategy):
    """Baseline strategy keeping machines in IDLE_READY whenever waiting."""

    @property
    def strategy_type(self) -> StrategyType:
        return StrategyType.ALWAYS_READY

    def evaluate_idle_window(
        self,
        machine: Any,
        window: IdleWindow,
        tariff_per_kwh: float = 8.0,
    ) -> IdleDecision:
        """Always Ready evaluation: always returns KEEP_READY with zero savings."""
        keep_ready_energy = float(machine.idle_power_kw) * (float(window.duration_min) / 60.0)

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
            idle_window_min=window.duration_min,
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
            reason_code=ReasonCode.ALWAYS_READY_DEFAULT,
            reason=(
                f"Always Ready baseline policy maintains {machine.name} in IDLE_READY state. "
                f"Consumes {keep_ready_energy:.2f} kWh over {window.duration_min} min window with zero transitions."
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
        """Always Ready policy:

        If active job -> RUNNING.
        Else -> IDLE_READY.
        """
        if runtime_state.active_job_id is not None:
            return MachineState.RUNNING
        return MachineState.IDLE_READY
