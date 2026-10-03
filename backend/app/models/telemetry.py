"""Simulation telemetry model and machine state enums."""

from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field


class MachineState(str, Enum):
    """Operational state of a manufacturing machine."""

    RUNNING = "RUNNING"
    IDLE_READY = "IDLE_READY"
    STANDBY = "STANDBY"
    STARTING = "STARTING"
    OFF = "OFF"


class Telemetry(SQLModel, table=True):
    """Telemetry data point recorded per machine per simulation time-step."""

    __tablename__ = "telemetry"

    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: int = Field(index=True, description="Simulation minute (e.g. 0 to 480)")
    machine_id: str = Field(foreign_key="machines.id", index=True, description="Associated machine ID")
    machine_state: MachineState = Field(index=True, description="State of machine at timestamp")
    power_kw: float = Field(ge=0.0, description="Instantaneous electrical power in kW")
    active_job_id: Optional[str] = Field(default=None, description="Active job ID if RUNNING")
    simulation_run_id: Optional[str] = Field(default=None, index=True, description="Associated simulation run UUID")
