"""Machine database model and validation."""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy.orm import validates


class Machine(SQLModel, table=True):
    """Manufacturing machine entity with energy and operational constraints."""

    __tablename__ = "machines"

    id: str = Field(primary_key=True, index=True, description="Unique machine identifier, e.g. CNC-01")
    name: str = Field(index=True, description="Human-readable machine name")
    machine_type: str = Field(default="CNC Machine", description="Type/category of equipment")

    # Power consumption ratings in kW
    run_power_kw: float = Field(ge=0.0, description="Active processing power consumption (kW)")
    idle_power_kw: float = Field(ge=0.0, description="Non-productive idle ready power consumption (kW)")
    standby_power_kw: float = Field(ge=0.0, description="Low-power standby state consumption (kW)")
    off_power_kw: float = Field(default=0.0, ge=0.0, description="Powered-off residual consumption (kW)")

    # Transition parameters
    restart_duration_min: int = Field(ge=0, description="Minutes required to restart/warm up to ready state")
    restart_energy_kwh: float = Field(ge=0.0, description="Energy consumed during restart warmup (kWh)")

    # Operational policy permissions
    standby_allowed: bool = Field(default=True, description="Whether machine supports entering standby")
    shutdown_allowed: bool = Field(default=False, description="Whether machine supports complete power shutdown")

    # Safety and equipment constraints
    minimum_off_time_min: int = Field(default=0, ge=0, description="Minimum off or standby duration required (min)")
    safety_buffer_min: int = Field(default=5, ge=0, description="Safety margin added before scheduled job (min)")

    # Metadata timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validates("name")
    def validate_name(self, key, value):
        if not value or not str(value).strip():
            raise ValueError("Machine name must not be empty")
        return str(value).strip()

    @validates("run_power_kw", "idle_power_kw", "standby_power_kw", "off_power_kw", "restart_energy_kwh")
    def validate_power_non_negative(self, key, value):
        if value is not None and float(value) < 0:
            raise ValueError(f"{key} cannot be negative")
        return float(value) if value is not None else value

    @validates("restart_duration_min", "minimum_off_time_min", "safety_buffer_min")
    def validate_duration_non_negative(self, key, value):
        if value is not None and int(value) < 0:
            raise ValueError(f"{key} cannot be negative")
        return int(value) if value is not None else value
