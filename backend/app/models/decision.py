"""IdleWise decision model and recommendation enums."""

from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field
from app.models.telemetry import MachineState


class RecommendedAction(str, Enum):
    """Decision recommendation generated for an idle machine."""

    KEEP_READY = "KEEP_READY"
    STANDBY = "STANDBY"
    SHUTDOWN = "SHUTDOWN"


class ProductionRisk(str, Enum):
    """Assessed risk of production impact or job delay."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Decision(SQLModel, table=True):
    """Audit log record for an explainable IdleWise decision."""

    __tablename__ = "decisions"

    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: int = Field(index=True, description="Simulation minute when decision was evaluated")
    machine_id: str = Field(foreign_key="machines.id", index=True, description="Evaluated machine ID")
    simulation_run_id: Optional[str] = Field(default=None, index=True, description="Associated simulation run UUID")

    current_state: MachineState = Field(description="Machine state at decision evaluation")
    recommended_action: RecommendedAction = Field(index=True, description="Action recommended by policy")
    idle_window_min: int = Field(description="Projected idle window duration in minutes")

    estimated_energy_saved_kwh: float = Field(default=0.0, description="Projected energy reduction in kWh")
    estimated_cost_saved: float = Field(default=0.0, description="Projected cost reduction based on active tariff")

    production_risk: ProductionRisk = Field(default=ProductionRisk.LOW, description="Risk assessment")
    reason: str = Field(description="Human-readable transparent operational rationale")
