"""IdleWise energy-aware machine idle-state optimization strategy.

Strategy C — IdleWise:
An intelligent, deterministic constraint-aware decision policy.
When a machine becomes idle between scheduled production jobs, IdleWise evaluates:
- Upcoming production requirement and idle window duration (G)
- Warmup restart duration (R) and restart energy penalty (E_restart)
- Production safety buffer margin (B)
- Machine power ratings across states: idle, standby, off (kW)
- Eligibility constraints: standby_allowed, shutdown_allowed, minimum_off_time_min
- Economic threshold: minimum_saving_kwh (default: 0.10 kWh)

IdleWise evaluates feasible candidates (KEEP_READY, STANDBY, SHUTDOWN) and selects the
lowest-energy safe operating plan while guaranteeing the machine is warmed up and ready
ahead of the next scheduled production job.
"""

from typing import List, Any, Optional, Dict
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


class IdleWiseStrategy(SimulationStrategy):
    """Energy-aware idle-state optimization strategy."""

    @property
    def strategy_type(self) -> StrategyType:
        return StrategyType.IDLEWISE

    def evaluate_idle_window(
        self,
        machine: Any,
        window: IdleWindow,
        tariff_per_kwh: float = 8.0,
    ) -> IdleDecision:
        """Evaluate an inter-job idle window and select lowest-energy feasible action.

        Candidate Actions:
        1. KEEP_READY: Baseline fallback. Energy = idle_power_kw * G / 60.
        2. STANDBY: Feasible if standby_allowed and G > R + B.
           Energy = (standby_power * (G - R - B) / 60) + restart_energy + (idle_power * B / 60).
        3. SHUTDOWN: Feasible if allow_shutdown, shutdown_allowed, G > R + B, and (G - R - B) >= min_off_time.
           Energy = (off_power * (G - R - B) / 60) + restart_energy + (idle_power * B / 60).
        """
        g = window.duration_min
        r = window.restart_duration_min
        b = window.safety_buffer_min
        min_saving = self.config.minimum_saving_kwh

        keep_ready_energy = float(machine.idle_power_kw) * (float(g) / 60.0)

        # ----------------------------------------------------------------------
        # Constraint 1: Safe restart window requirement (G > R + B)
        # ----------------------------------------------------------------------
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
                    f"The machine cannot complete its restart cycle ({r} min) and safety buffer ({b} min) "
                    f"before next scheduled job ({window.next_job_id} at minute {window.next_job_start}). "
                    f"Idle window of {g} min is <= required margin of {r + b} min. Kept in IDLE_READY."
                ),
                execution_plan=plan,
            )

        # ----------------------------------------------------------------------
        # Candidate Evaluation
        # ----------------------------------------------------------------------
        candidates: Dict[str, Dict[str, Any]] = {}
        restart_start = window.next_job_start - r - b
        ready_minute = window.next_job_start - b

        # Candidate A: STANDBY
        standby_rejected_reason: Optional[str] = None
        if not window.standby_allowed:
            standby_rejected_reason = "Standby not permitted by machine configuration."
        else:
            standby_duration = g - r - b
            standby_energy = (
                (float(machine.standby_power_kw) * float(standby_duration) / 60.0)
                + float(machine.restart_energy_kwh)
                + (float(machine.idle_power_kw) * float(b) / 60.0)
            )
            standby_saving = keep_ready_energy - standby_energy
            candidates["STANDBY"] = {
                "energy": standby_energy,
                "saving": standby_saving,
                "duration": standby_duration,
            }

        # Candidate B: SHUTDOWN
        shutdown_rejected_reason: Optional[str] = None
        if not self.config.allow_shutdown:
            shutdown_rejected_reason = "Shutdown disabled in strategy configuration."
        elif not window.shutdown_allowed:
            shutdown_rejected_reason = "Shutdown not permitted by machine configuration."
        else:
            available_off_duration = g - r - b
            if available_off_duration < window.minimum_off_time_min:
                shutdown_rejected_reason = (
                    f"Available off duration ({available_off_duration} min) does not satisfy "
                    f"minimum off-time requirement ({window.minimum_off_time_min} min)."
                )
            else:
                shutdown_energy = (
                    (float(machine.off_power_kw) * float(available_off_duration) / 60.0)
                    + float(machine.restart_energy_kwh)
                    + (float(machine.idle_power_kw) * float(b) / 60.0)
                )
                shutdown_saving = keep_ready_energy - shutdown_energy
                candidates["SHUTDOWN"] = {
                    "energy": shutdown_energy,
                    "saving": shutdown_saving,
                    "duration": available_off_duration,
                }

        # Filter candidates by minimum energy saving threshold
        viable_candidates = {
            k: v for k, v in candidates.items() if v["saving"] >= min_saving
        }

        # ----------------------------------------------------------------------
        # Decision Selection
        # ----------------------------------------------------------------------
        standby_energy_val = round(candidates["STANDBY"]["energy"], 4) if "STANDBY" in candidates else None
        shutdown_energy_val = round(candidates["SHUTDOWN"]["energy"], 4) if "SHUTDOWN" in candidates else None

        if not viable_candidates:
            # Fallback to KEEP_READY
            plan = MachineExecutionPlan(
                action=RecommendedAction.KEEP_READY,
                sleep_start=window.start_minute,
                restart_start_minute=None,
                ready_minute=None,
                idle_window_end=window.end_minute,
            )

            # Determine most informative reason code
            if not candidates:
                if not window.standby_allowed and not (self.config.allow_shutdown and window.shutdown_allowed):
                    code = ReasonCode.STANDBY_NOT_SUPPORTED
                    reason = f"Machine {machine.name} does not permit standby or shutdown transitions. Maintained in IDLE_READY."
                elif shutdown_rejected_reason and "minimum off-time" in shutdown_rejected_reason:
                    code = ReasonCode.MINIMUM_OFF_TIME_VIOLATION
                    reason = f"{shutdown_rejected_reason} Maintained in IDLE_READY."
                else:
                    code = ReasonCode.STANDBY_NOT_SUPPORTED
                    reason = f"Neither standby nor shutdown is supported. Maintained in IDLE_READY."
            else:
                code = ReasonCode.NO_MEANINGFUL_ENERGY_SAVING
                best_saving = max(v["saving"] for v in candidates.values())
                if best_saving <= 0:
                    reason = (
                        f"Transitioning to low-power state would consume more energy than keeping ready "
                        f"(net saving: {best_saving:.3f} kWh) due to restart warmup penalty ({machine.restart_energy_kwh:.2f} kWh). "
                        f"Machine kept in IDLE_READY."
                    )
                else:
                    reason = (
                        f"Estimated saving ({best_saving:.3f} kWh) is below configured minimum threshold "
                        f"of {min_saving:.2f} kWh. Machine kept in IDLE_READY to avoid unnecessary cycling."
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
                standby_energy_kwh=standby_energy_val,
                shutdown_energy_kwh=shutdown_energy_val,
                selected_energy_kwh=round(keep_ready_energy, 4),
                estimated_energy_saved_kwh=0.0,
                estimated_cost_saved=0.0,
                restart_start_minute=None,
                ready_minute=None,
                production_risk=ProductionRisk.LOW,
                reason_code=code,
                reason=reason,
                execution_plan=plan,
            )

        # Select candidate with lowest total energy (highest saving)
        # Tie-breaking: prefer STANDBY over SHUTDOWN if difference is negligible (< 1e-6)
        if "SHUTDOWN" in viable_candidates and "STANDBY" in viable_candidates:
            if viable_candidates["SHUTDOWN"]["energy"] < viable_candidates["STANDBY"]["energy"] - 1e-6:
                chosen_action_str = "SHUTDOWN"
            else:
                chosen_action_str = "STANDBY"
        elif "SHUTDOWN" in viable_candidates:
            chosen_action_str = "SHUTDOWN"
        else:
            chosen_action_str = "STANDBY"

        chosen = viable_candidates[chosen_action_str]
        selected_energy = chosen["energy"]
        energy_saved = chosen["saving"]
        cost_saved = energy_saved * tariff_per_kwh

        if chosen_action_str == "STANDBY":
            action = RecommendedAction.STANDBY
            code = ReasonCode.STANDBY_LOWEST_ENERGY
            plan = MachineExecutionPlan(
                action=RecommendedAction.STANDBY,
                sleep_start=window.start_minute,
                restart_start_minute=restart_start,
                ready_minute=ready_minute,
                idle_window_end=window.end_minute,
            )
            reason = (
                f"Recommendation: STANDBY | Next job: {g} min away | Restart duration: {r} min | "
                f"Safety buffer: {b} min | Safe standby duration: {chosen['duration']} min. "
                f"Keep-ready energy: {keep_ready_energy:.2f} kWh, Standby plan energy: {selected_energy:.2f} kWh. "
                f"Estimated saving: {energy_saved:.2f} kWh (₹{cost_saved:.2f}). "
                f"Production requirement: Machine will be ready {b} minutes before next job. "
                f"Standby provides the lowest-energy feasible operating plan while preserving the production safety margin."
            )
        else:
            action = RecommendedAction.SHUTDOWN
            code = ReasonCode.SHUTDOWN_LOWEST_ENERGY
            plan = MachineExecutionPlan(
                action=RecommendedAction.SHUTDOWN,
                sleep_start=window.start_minute,
                restart_start_minute=restart_start,
                ready_minute=ready_minute,
                idle_window_end=window.end_minute,
            )
            reason = (
                f"Recommendation: SHUTDOWN | Next job: {g} min away | Restart duration: {r} min | "
                f"Safety buffer: {b} min | Safe off duration: {chosen['duration']} min "
                f"(satisfies {window.minimum_off_time_min} min requirement). "
                f"Keep-ready energy: {keep_ready_energy:.2f} kWh, Shutdown plan energy: {selected_energy:.2f} kWh. "
                f"Estimated saving: {energy_saved:.2f} kWh (₹{cost_saved:.2f}). "
                f"Production requirement: Machine will be ready {b} minutes before next job. "
                f"Shutdown provides the lowest-energy feasible operating plan while preserving safety and minimum off-time constraints."
            )

        return IdleDecision(
            machine_id=machine.id,
            timestamp=window.start_minute,
            idle_window_min=g,
            previous_job_id=window.previous_job_id,
            next_job_id=window.next_job_id,
            next_job_start=window.next_job_start,
            recommended_action=action,
            keep_ready_energy_kwh=round(keep_ready_energy, 4),
            standby_energy_kwh=standby_energy_val,
            shutdown_energy_kwh=shutdown_energy_val,
            selected_energy_kwh=round(selected_energy, 4),
            estimated_energy_saved_kwh=round(energy_saved, 4),
            estimated_cost_saved=round(cost_saved, 2),
            restart_start_minute=restart_start,
            ready_minute=ready_minute,
            production_risk=ProductionRisk.LOW,
            reason_code=code,
            reason=reason,
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
        if plan is not None:
            if plan.restart_start_minute is not None and current_step >= plan.restart_start_minute:
                if plan.ready_minute is not None and current_step >= plan.ready_minute:
                    return MachineState.IDLE_READY
                return MachineState.STARTING
            elif plan.action == RecommendedAction.STANDBY:
                return MachineState.STANDBY
            elif plan.action == RecommendedAction.SHUTDOWN:
                return MachineState.OFF
            else:
                return MachineState.IDLE_READY

        return MachineState.IDLE_READY
