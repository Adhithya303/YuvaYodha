"""Simulation run model and strategy enums."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field


class StrategyType(str, Enum):
    """Energy management operational strategy."""

    ALWAYS_READY = "ALWAYS_READY"
    FIXED_TIMER = "FIXED_TIMER"
    IDLEWISE = "IDLEWISE"


class SimulationStatus(str, Enum):
    """Execution status of a simulation run."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class SimulationRun(SQLModel, table=True):
    """Recorded metadata and aggregated KPIs for a simulation experiment."""

    __tablename__ = "simulation_runs"

    id: str = Field(primary_key=True, index=True, description="Unique simulation run UUID")
    scenario_name: str = Field(default="8-Hour Factory Shift", description="Descriptive scenario name")
    strategy: StrategyType = Field(index=True, description="Strategy applied in this run")
    status: SimulationStatus = Field(default=SimulationStatus.PENDING, index=True, description="Current execution status")

    # Aggregated KPI outcomes
    total_energy_kwh: Optional[float] = Field(default=None, description="Total electrical energy consumed (kWh)")
    total_cost: Optional[float] = Field(default=None, description="Total electricity cost")
    jobs_completed: int = Field(default=0, description="Count of successfully finished jobs")
    late_jobs: int = Field(default=0, description="Count of jobs that exceeded deadline")
    total_delay_minutes: int = Field(default=0, description="Sum of delay minutes across all jobs")
    energy_per_unit: Optional[float] = Field(default=None, description="Average kWh consumed per finished unit")

    started_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = Field(default=None)
