"""Schemas for simulation telemetry playback and replay frames."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.telemetry import MachineState
from app.models.decision import RecommendedAction, ProductionRisk
from app.models.simulation_run import StrategyType


class PlaybackMachineStatic(BaseModel):
    """Static specifications for a machine used in playback."""

    id: str
    name: str
    machine_type: str
    run_power_kw: float
    idle_power_kw: float
    standby_power_kw: float
    off_power_kw: float
    restart_duration_min: int
    safety_buffer_min: int


class PlaybackMachineState(BaseModel):
    """Instantaneous operational state of a single machine at a simulation minute."""

    machine_id: str
    state: MachineState
    power_kw: float
    active_job_id: Optional[str] = None
    next_job_id: Optional[str] = None
    next_job_start: Optional[str] = None
    context_note: Optional[str] = None


class PlaybackDecisionEvent(BaseModel):
    """Decision event occurring at a specific playback frame."""

    timestamp: int
    time_str: str
    machine_id: str
    recommended_action: RecommendedAction
    idle_window_min: int
    estimated_energy_saved_kwh: float
    estimated_cost_saved: float
    production_risk: ProductionRisk
    reason: str
    reason_code: Optional[str] = None


class PlaybackCumulative(BaseModel):
    """Cumulative shift progress metrics at a specific playback frame."""

    energy_kwh: float
    cost: float
    jobs_completed: int
    units_produced: int
    factory_power_kw: float


class PlaybackFrame(BaseModel):
    """Complete factory state at a 1-minute discrete playback interval."""

    minute_index: int
    simulation_time: str
    progress_percent: float
    machines: List[PlaybackMachineState]
    decisions: List[PlaybackDecisionEvent] = Field(default_factory=list)
    cumulative: PlaybackCumulative


class PlaybackResponse(BaseModel):
    """Complete shift telemetry playback dataset for client-side replay."""

    run_id: str
    scenario_id: str
    strategy: StrategyType
    shift_start: str
    shift_end: str
    total_frames: int
    machines: List[PlaybackMachineStatic]
    frames: List[PlaybackFrame]
    final_summary: Dict[str, Any]
