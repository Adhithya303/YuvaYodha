"""Pydantic schemas for Machine API endpoints."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class MachineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Machine display name")
    machine_type: str = Field(default="CNC Machine", max_length=100)
    run_power_kw: float = Field(..., ge=0.0, description="Operating power (kW)")
    idle_power_kw: float = Field(..., ge=0.0, description="Idle power (kW)")
    standby_power_kw: float = Field(..., ge=0.0, description="Standby power (kW)")
    off_power_kw: float = Field(default=0.0, ge=0.0, description="Off power (kW)")
    restart_duration_min: int = Field(..., ge=0, description="Restart warmup minutes")
    restart_energy_kwh: float = Field(..., ge=0.0, description="Restart energy in kWh")
    standby_allowed: bool = Field(default=True)
    shutdown_allowed: bool = Field(default=False)
    minimum_off_time_min: int = Field(default=0, ge=0)
    safety_buffer_min: int = Field(default=5, ge=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Machine name must not be empty")
        return v.strip()


class MachineCreate(MachineBase):
    id: str = Field(..., min_length=1, max_length=50, description="Machine ID, e.g. CNC-01")


class MachineUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    machine_type: Optional[str] = None
    run_power_kw: Optional[float] = Field(default=None, ge=0.0)
    idle_power_kw: Optional[float] = Field(default=None, ge=0.0)
    standby_power_kw: Optional[float] = Field(default=None, ge=0.0)
    off_power_kw: Optional[float] = Field(default=None, ge=0.0)
    restart_duration_min: Optional[int] = Field(default=None, ge=0)
    restart_energy_kwh: Optional[float] = Field(default=None, ge=0.0)
    standby_allowed: Optional[bool] = None
    shutdown_allowed: Optional[bool] = None
    minimum_off_time_min: Optional[int] = Field(default=None, ge=0)
    safety_buffer_min: Optional[int] = Field(default=None, ge=0)


class MachineRead(MachineBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
