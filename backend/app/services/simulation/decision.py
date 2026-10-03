"""Idle decision structures, configuration, reason codes, and planning models."""

from enum import Enum
from typing import Optional, Any
from dataclasses import dataclass
from pydantic import BaseModel, Field as PydField
from app.models.decision import RecommendedAction, ProductionRisk
from app.models.telemetry import MachineState


class ReasonCode(str, Enum):
    """Machine-readable decision reason codes."""

    SHORT_IDLE_WINDOW = "SHORT_IDLE_WINDOW"
    RESTART_MARGIN_INSUFFICIENT = "RESTART_MARGIN_INSUFFICIENT"
    STANDBY_NOT_SUPPORTED = "STANDBY_NOT_SUPPORTED"
    SHUTDOWN_NOT_SUPPORTED = "SHUTDOWN_NOT_SUPPORTED"
    MINIMUM_OFF_TIME_VIOLATION = "MINIMUM_OFF_TIME_VIOLATION"
    NO_MEANINGFUL_ENERGY_SAVING = "NO_MEANINGFUL_ENERGY_SAVING"
    STANDBY_LOWEST_ENERGY = "STANDBY_LOWEST_ENERGY"
    SHUTDOWN_LOWEST_ENERGY = "SHUTDOWN_LOWEST_ENERGY"
    FIXED_TIMER_THRESHOLD_EXCEEDED = "FIXED_TIMER_THRESHOLD_EXCEEDED"
    FIXED_TIMER_BELOW_THRESHOLD = "FIXED_TIMER_BELOW_THRESHOLD"
    ALWAYS_READY_DEFAULT = "ALWAYS_READY_DEFAULT"


class StrategyConfig(BaseModel):
    """Configuration parameters for simulation operational strategies."""

    fixed_timer_threshold_min: int = PydField(
        default=30,
        ge=1,
        description="Idle duration threshold in minutes for Fixed Timer standby transition",
    )
    minimum_saving_kwh: float = PydField(
        default=0.10,
        ge=0.0,
        description="Minimum net energy saving in kWh required to justify state cycling",
    )
    allow_shutdown: bool = PydField(
        default=True,
        description="Whether IdleWise is permitted to evaluate complete machine shutdown (if machine supports it)",
    )


class IdleWindow(BaseModel):
    """Inter-job idle window between two scheduled production jobs on a machine."""

    machine_id: str
    start_minute: int
    end_minute: int
    duration_min: int
    previous_job_id: Optional[str] = None
    next_job_id: str
    next_job_start: int
    restart_duration_min: int
    safety_buffer_min: int
    standby_allowed: bool
    shutdown_allowed: bool
    minimum_off_time_min: int


@dataclass
class IdleDecisionContext:
    """Strategy evaluation context containing all parameters for isolated, deterministic testing."""

    current_minute: int
    machine: Any
    current_state: MachineState
    window: IdleWindow
    tariff_per_kwh: float = 8.0
    strategy_config: Optional[StrategyConfig] = None


class MachineExecutionPlan(BaseModel):
    """Deterministic timeline plan for a machine during an idle window."""

    action: RecommendedAction
    sleep_start: int
    restart_start_minute: Optional[int] = None
    ready_minute: Optional[int] = None
    idle_window_end: int



class IdleDecision(BaseModel):
    """Structured, explainable decision generated for an idle window."""

    machine_id: str
    timestamp: int
    idle_window_min: int
    previous_job_id: Optional[str] = None
    next_job_id: str
    next_job_start: int

    recommended_action: RecommendedAction
    keep_ready_energy_kwh: float
    standby_energy_kwh: Optional[float] = None
    shutdown_energy_kwh: Optional[float] = None
    selected_energy_kwh: float

    estimated_energy_saved_kwh: float
    estimated_cost_saved: float

    restart_start_minute: Optional[int] = None
    ready_minute: Optional[int] = None

    production_risk: ProductionRisk = ProductionRisk.LOW
    reason_code: ReasonCode
    reason: str

    execution_plan: Optional[MachineExecutionPlan] = None
