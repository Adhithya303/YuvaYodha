"""Factory simulation engine module.

Executes discrete 1-minute time-step simulation over complete factory shifts.
Calculates instantaneous power, accumulates energy consumption, tracks machine
operational states, executes jobs, and emits granular telemetry.
"""

import uuid
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from pydantic import BaseModel, Field as PydField

from app.models.telemetry import MachineState
from app.models.job import JobStatus
from app.models.simulation_run import StrategyType, SimulationStatus
from app.services.simulation.clock import SimulationClock
from app.services.simulation.state_machine import validate_transition
from app.services.simulation.energy import (
    calculate_step_energy_kwh,
    calculate_total_cost,
    calculate_energy_per_unit,
    get_machine_power_kw,
)
from app.services.simulation.scenario import (
    ScenarioDefinition,
    ScenarioMachine,
    ScenarioJob,
    validate_scenario,
)
from app.services.simulation.decision import (
    IdleWindow,
    IdleDecision,
    MachineExecutionPlan,
    StrategyConfig,
)
from app.services.simulation.strategies import get_strategy

logger = logging.getLogger("idlewise.simulation")


# ==============================================================================
# RUNTIME IN-MEMORY STATE OBJECTS (Section 7, 25)
# ==============================================================================

@dataclass
class JobRuntimeState:
    """Mutable runtime tracking for a scheduled production job."""

    id: str
    job_name: str
    product_type: str
    machine_id: str
    scheduled_start: int
    duration_min: int
    deadline: int
    quantity: int
    status: JobStatus = JobStatus.QUEUED
    actual_start: Optional[int] = None
    actual_end: Optional[int] = None
    remaining_minutes: int = 0
    delay_minutes: int = 0

    def __post_init__(self):
        self.remaining_minutes = self.duration_min


@dataclass
class MachineRuntimeState:
    """Mutable runtime operational state for a machine during simulation."""

    machine_id: str
    name: str
    state: MachineState = MachineState.IDLE_READY
    active_job_id: Optional[str] = None
    current_power_kw: float = 0.0
    cumulative_energy_kwh: float = 0.0
    jobs_completed: int = 0
    state_durations: Dict[str, int] = field(default_factory=lambda: {
        MachineState.RUNNING.value: 0,
        MachineState.IDLE_READY.value: 0,
        MachineState.STANDBY.value: 0,
        MachineState.STARTING.value: 0,
        MachineState.OFF.value: 0,
    })

    # Strategy plan and inter-job tracking (Prompt 3)
    current_plan: Optional[MachineExecutionPlan] = None
    last_completed_job_id: Optional[str] = None
    last_completed_minute: Optional[int] = None

    # State transition event counts
    number_of_standby_events: int = 0
    number_of_shutdown_events: int = 0
    number_of_restart_events: int = 0

    # Categorized energy breakdown
    running_energy_kwh: float = 0.0
    idle_energy_kwh: float = 0.0
    standby_energy_kwh: float = 0.0
    restart_energy_kwh: float = 0.0
    off_energy_kwh: float = 0.0


# ==============================================================================
# RESULT STRUCTURES (Section 21, 22, 57)
# ==============================================================================

class MachineResultSummary(BaseModel):
    machine_id: str
    name: str
    machine_type: str
    energy_kwh: float
    minutes_running: int
    minutes_idle_ready: int
    minutes_standby: int
    minutes_starting: int
    minutes_off: int
    jobs_completed: int
    utilization_percent: float

    # Energy breakdown by state
    running_energy_kwh: float = 0.0
    idle_energy_kwh: float = 0.0
    standby_energy_kwh: float = 0.0
    restart_energy_kwh: float = 0.0
    off_energy_kwh: float = 0.0

    # Operational event counts
    number_of_standby_events: int = 0
    number_of_shutdown_events: int = 0
    number_of_restart_events: int = 0


class JobResultSummary(BaseModel):
    id: str
    job_name: str
    product_type: str
    machine_id: str
    scheduled_start: int
    actual_start: Optional[int]
    actual_end: Optional[int]
    duration_min: int
    deadline: int
    quantity: int
    status: JobStatus
    delay_minutes: int


class SimulationResult(BaseModel):
    """Structured, reproducible outcome of a complete simulation run."""

    simulation_run_id: str
    scenario_id: str
    scenario_name: str
    strategy: StrategyType
    status: SimulationStatus

    shift_start_time: str
    shift_end_time: str
    shift_minutes: int

    total_energy_kwh: float
    total_cost: float
    electricity_tariff_per_kwh: float
    currency: str

    total_units_produced: int
    energy_per_unit: float

    jobs_completed: int
    late_jobs: int
    total_delay_minutes: int
    factory_utilization_percent: float

    # Prompt 3 extensions
    strategy_config: StrategyConfig = PydField(default_factory=StrategyConfig)
    decisions: List[IdleDecision] = PydField(default_factory=list)

    # Factory-level state energy breakdown
    running_energy_kwh: float = 0.0
    idle_energy_kwh: float = 0.0
    standby_energy_kwh: float = 0.0
    restart_energy_kwh: float = 0.0
    off_energy_kwh: float = 0.0

    # Factory-level event totals
    number_of_standby_events: int = 0
    number_of_shutdown_events: int = 0
    number_of_restart_events: int = 0

    machine_results: List[MachineResultSummary]
    job_results: List[JobResultSummary]
    telemetry_records: List[Dict[str, Any]] = PydField(default_factory=list, exclude=False)


# ==============================================================================
# SIMULATION ENGINE
# ==============================================================================

class SimulationEngine:
    """Discrete time-step manufacturing shift simulator."""

    def __init__(
        self,
        scenario: ScenarioDefinition,
        strategy_type: StrategyType = StrategyType.ALWAYS_READY,
        strategy_config: Optional[StrategyConfig] = None,
    ):
        # Validate scenario constraints before execution
        validate_scenario(scenario)

        self.scenario = scenario
        self.strategy_config = strategy_config or StrategyConfig()
        self.strategy = get_strategy(strategy_type, config=self.strategy_config)
        self.run_id = str(uuid.uuid4())

        self.clock = SimulationClock(shift_minutes=scenario.shift_minutes)
        self.decisions: List[IdleDecision] = []

        # Initialize runtime tracking
        self.machine_runtime: Dict[str, MachineRuntimeState] = {
            m.id: MachineRuntimeState(
                machine_id=m.id,
                name=m.name,
                state=MachineState.IDLE_READY,
            )
            for m in scenario.machines
        }

        self.job_runtime: Dict[str, JobRuntimeState] = {
            j.id: JobRuntimeState(
                id=j.id,
                job_name=j.job_name,
                product_type=j.product_type,
                machine_id=j.machine_id,
                scheduled_start=j.scheduled_start,
                duration_min=j.duration_min,
                deadline=j.deadline,
                quantity=j.quantity,
            )
            for j in scenario.jobs
        }

        self.telemetry_records: List[Dict[str, Any]] = []

    def run(self) -> SimulationResult:
        """Execute the entire shift simulation from start to end minute.

        Returns:
            SimulationResult containing all aggregated metrics, machine state summaries,
            decisions, and telemetry data points.
        """
        logger.info(
            f"Starting simulation run '{self.run_id}' [Scenario: '{self.scenario.id}', "
            f"Strategy: '{self.strategy.strategy_type.value}', Shift: {self.scenario.shift_minutes} mins]"
        )

        machines_by_id = {m.id: m for m in self.scenario.machines}

        # Time-step loop: T in [0, shift_minutes)
        while not self.clock.is_finished:
            t = self.clock.current_step

            # Process each machine at minute t
            for m_id, machine in machines_by_id.items():
                m_state = self.machine_runtime[m_id]

                # 1. Check for scheduled jobs to start at minute t
                if m_state.active_job_id is None:
                    for job in self.job_runtime.values():
                        if (
                            job.machine_id == m_id
                            and job.status == JobStatus.QUEUED
                            and job.scheduled_start == t
                        ):
                            # Start job
                            job.status = JobStatus.ACTIVE
                            job.actual_start = t
                            m_state.active_job_id = job.id
                            m_state.current_plan = None
                            break

                # 2. Check for eligible inter-job idle window (Section 5 & 6)
                # An inter-job idle window begins when a machine completes a job
                # and has an upcoming queued job in the remainder of the shift.
                if m_state.active_job_id is None and m_state.current_plan is None:
                    if m_state.last_completed_job_id is not None:
                        upcoming_queued = [
                            j for j in self.job_runtime.values()
                            if j.machine_id == m_id and j.status == JobStatus.QUEUED and j.scheduled_start > t
                        ]
                        if upcoming_queued:
                            next_job = min(upcoming_queued, key=lambda j: j.scheduled_start)
                            gap_duration = next_job.scheduled_start - t
                            if gap_duration > 0:
                                window = IdleWindow(
                                    machine_id=m_id,
                                    start_minute=t,
                                    end_minute=next_job.scheduled_start,
                                    duration_min=gap_duration,
                                    previous_job_id=m_state.last_completed_job_id,
                                    next_job_id=next_job.id,
                                    next_job_start=next_job.scheduled_start,
                                    restart_duration_min=machine.restart_duration_min,
                                    safety_buffer_min=machine.safety_buffer_min,
                                    standby_allowed=machine.standby_allowed,
                                    shutdown_allowed=machine.shutdown_allowed,
                                    minimum_off_time_min=machine.minimum_off_time_min,
                                )
                                decision = self.strategy.evaluate_idle_window(
                                    machine=machine,
                                    window=window,
                                    tariff_per_kwh=self.scenario.electricity_tariff_per_kwh,
                                )
                                self.decisions.append(decision)
                                m_state.current_plan = decision.execution_plan

                # If current plan completed its idle window, clear it
                if m_state.current_plan is not None and t >= m_state.current_plan.idle_window_end:
                    m_state.current_plan = None

                # 3. Strategy decision for machine state during interval [t, t+1)
                upcoming_jobs = [
                    j for j in self.job_runtime.values()
                    if j.machine_id == m_id and j.status == JobStatus.QUEUED and j.scheduled_start > t
                ]
                target_state = self.strategy.decide_machine_state(
                    machine=machine,
                    runtime_state=m_state,
                    current_step=t,
                    upcoming_jobs=upcoming_jobs,
                )

                # 4. Validate and apply state transition
                prev_state = m_state.state
                validate_transition(prev_state, target_state)
                m_state.state = target_state

                # Track state transition events
                if target_state != prev_state:
                    if target_state == MachineState.STANDBY:
                        m_state.number_of_standby_events += 1
                    elif target_state == MachineState.OFF:
                        m_state.number_of_shutdown_events += 1
                    elif target_state == MachineState.STARTING:
                        m_state.number_of_restart_events += 1

                # 5. Calculate power and energy for this 1-minute step
                power_kw = get_machine_power_kw(machine, target_state)
                step_energy_kwh = calculate_step_energy_kwh(power_kw, 1.0)

                m_state.current_power_kw = power_kw
                m_state.cumulative_energy_kwh += step_energy_kwh
                m_state.state_durations[target_state.value] += 1

                # Categorize step energy breakdown
                if target_state == MachineState.RUNNING:
                    m_state.running_energy_kwh += step_energy_kwh
                elif target_state == MachineState.IDLE_READY:
                    m_state.idle_energy_kwh += step_energy_kwh
                elif target_state == MachineState.STANDBY:
                    m_state.standby_energy_kwh += step_energy_kwh
                elif target_state == MachineState.STARTING:
                    m_state.restart_energy_kwh += step_energy_kwh
                elif target_state == MachineState.OFF:
                    m_state.off_energy_kwh += step_energy_kwh

                # 6. Record telemetry
                self.telemetry_records.append({
                    "timestamp": t,
                    "machine_id": m_id,
                    "machine_state": target_state,
                    "power_kw": power_kw,
                    "active_job_id": m_state.active_job_id,
                    "simulation_run_id": self.run_id,
                })

                # 7. Job execution progress
                if m_state.active_job_id is not None:
                    active_job = self.job_runtime[m_state.active_job_id]
                    active_job.remaining_minutes -= 1

                    if active_job.remaining_minutes <= 0:
                        # Job completed at t + 1
                        completion_time = t + 1
                        active_job.actual_end = completion_time
                        if completion_time > active_job.deadline:
                            active_job.status = JobStatus.DELAYED
                            active_job.delay_minutes = completion_time - active_job.deadline
                        else:
                            active_job.status = JobStatus.COMPLETED

                        m_state.jobs_completed += 1
                        m_state.last_completed_job_id = active_job.id
                        m_state.last_completed_minute = completion_time
                        m_state.active_job_id = None
                        m_state.state = MachineState.IDLE_READY

            # Advance clock to next minute
            self.clock.advance()

        # ======================================================================
        # AGGREGATE FINAL RESULTS
        # ======================================================================
        total_energy_kwh = sum(m.cumulative_energy_kwh for m in self.machine_runtime.values())
        total_cost = calculate_total_cost(total_energy_kwh, self.scenario.electricity_tariff_per_kwh)

        completed_jobs_list = [j for j in self.job_runtime.values() if j.status in (JobStatus.COMPLETED, JobStatus.DELAYED)]
        late_jobs_list = [j for j in self.job_runtime.values() if j.status == JobStatus.DELAYED or (j.actual_end and j.actual_end > j.deadline)]
        total_delay_min = sum(j.delay_minutes for j in self.job_runtime.values())

        total_units_produced = sum(j.quantity for j in completed_jobs_list)
        energy_per_unit = calculate_energy_per_unit(total_energy_kwh, total_units_produced)

        total_running_minutes = sum(
            m.state_durations[MachineState.RUNNING.value] for m in self.machine_runtime.values()
        )
        total_possible_machine_minutes = len(self.scenario.machines) * self.scenario.shift_minutes
        factory_utilization = (
            (total_running_minutes / total_possible_machine_minutes * 100.0)
            if total_possible_machine_minutes > 0 else 0.0
        )

        total_running_energy = sum(m.running_energy_kwh for m in self.machine_runtime.values())
        total_idle_energy = sum(m.idle_energy_kwh for m in self.machine_runtime.values())
        total_standby_energy = sum(m.standby_energy_kwh for m in self.machine_runtime.values())
        total_restart_energy = sum(m.restart_energy_kwh for m in self.machine_runtime.values())
        total_off_energy = sum(m.off_energy_kwh for m in self.machine_runtime.values())

        total_standby_events = sum(m.number_of_standby_events for m in self.machine_runtime.values())
        total_shutdown_events = sum(m.number_of_shutdown_events for m in self.machine_runtime.values())
        total_restart_events = sum(m.number_of_restart_events for m in self.machine_runtime.values())

        machine_summaries: List[MachineResultSummary] = []
        for m in self.scenario.machines:
            r = self.machine_runtime[m.id]
            run_mins = r.state_durations[MachineState.RUNNING.value]
            util_pct = (run_mins / self.scenario.shift_minutes * 100.0) if self.scenario.shift_minutes > 0 else 0.0
            machine_summaries.append(MachineResultSummary(
                machine_id=m.id,
                name=m.name,
                machine_type=m.machine_type,
                energy_kwh=r.cumulative_energy_kwh,
                minutes_running=run_mins,
                minutes_idle_ready=r.state_durations[MachineState.IDLE_READY.value],
                minutes_standby=r.state_durations[MachineState.STANDBY.value],
                minutes_starting=r.state_durations[MachineState.STARTING.value],
                minutes_off=r.state_durations[MachineState.OFF.value],
                jobs_completed=r.jobs_completed,
                utilization_percent=util_pct,
                running_energy_kwh=r.running_energy_kwh,
                idle_energy_kwh=r.idle_energy_kwh,
                standby_energy_kwh=r.standby_energy_kwh,
                restart_energy_kwh=r.restart_energy_kwh,
                off_energy_kwh=r.off_energy_kwh,
                number_of_standby_events=r.number_of_standby_events,
                number_of_shutdown_events=r.number_of_shutdown_events,
                number_of_restart_events=r.number_of_restart_events,
            ))

        job_summaries: List[JobResultSummary] = [
            JobResultSummary(
                id=j.id,
                job_name=j.job_name,
                product_type=j.product_type,
                machine_id=j.machine_id,
                scheduled_start=j.scheduled_start,
                actual_start=j.actual_start,
                actual_end=j.actual_end,
                duration_min=j.duration_min,
                deadline=j.deadline,
                quantity=j.quantity,
                status=j.status,
                delay_minutes=j.delay_minutes,
            )
            for j in self.job_runtime.values()
        ]

        logger.info(
            f"Simulation completed '{self.run_id}': Total Energy={total_energy_kwh:.3f} kWh, "
            f"Cost={total_cost:.2f} {self.scenario.currency}, Jobs Completed={len(completed_jobs_list)}/{len(self.job_runtime)}, "
            f"Decisions={len(self.decisions)}"
        )

        return SimulationResult(
            simulation_run_id=self.run_id,
            scenario_id=self.scenario.id,
            scenario_name=self.scenario.name,
            strategy=self.strategy.strategy_type,
            status=SimulationStatus.COMPLETED,
            shift_start_time=self.scenario.shift_start_time,
            shift_end_time=self.scenario.shift_end_time,
            shift_minutes=self.scenario.shift_minutes,
            total_energy_kwh=total_energy_kwh,
            total_cost=total_cost,
            electricity_tariff_per_kwh=self.scenario.electricity_tariff_per_kwh,
            currency=self.scenario.currency,
            total_units_produced=total_units_produced,
            energy_per_unit=energy_per_unit,
            jobs_completed=len(completed_jobs_list),
            late_jobs=len(late_jobs_list),
            total_delay_minutes=total_delay_min,
            factory_utilization_percent=factory_utilization,
            strategy_config=self.strategy_config,
            decisions=self.decisions,
            running_energy_kwh=total_running_energy,
            idle_energy_kwh=total_idle_energy,
            standby_energy_kwh=total_standby_energy,
            restart_energy_kwh=total_restart_energy,
            off_energy_kwh=total_off_energy,
            number_of_standby_events=total_standby_events,
            number_of_shutdown_events=total_shutdown_events,
            number_of_restart_events=total_restart_events,
            machine_results=machine_summaries,
            job_results=job_summaries,
            telemetry_records=self.telemetry_records,
        )
