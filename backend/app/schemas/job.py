"""Pydantic schemas for Job API endpoints."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.models.job import JobStatus


class JobBase(BaseModel):
    job_name: str = Field(..., min_length=1, max_length=120)
    product_type: str = Field(default="Product A", max_length=100)
    machine_id: str = Field(..., min_length=1, max_length=50)
    scheduled_start: int = Field(..., ge=0, description="Scheduled start in simulation minutes")
    duration_min: int = Field(..., gt=0, description="Duration in minutes (must be > 0)")
    deadline: int = Field(..., ge=0, description="Target deadline minute")
    status: JobStatus = Field(default=JobStatus.QUEUED)
    quantity: int = Field(default=1, gt=0, description="Quantity of units (must be > 0)")

    @field_validator("duration_min")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("duration_min must be greater than 0")
        return v

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("quantity must be greater than 0")
        return v


class JobCreate(JobBase):
    id: str = Field(..., min_length=1, max_length=50, description="Job ID, e.g. JOB-001")


class JobUpdate(BaseModel):
    job_name: Optional[str] = None
    product_type: Optional[str] = None
    machine_id: Optional[str] = None
    scheduled_start: Optional[int] = Field(default=None, ge=0)
    duration_min: Optional[int] = Field(default=None, gt=0)
    deadline: Optional[int] = Field(default=None, ge=0)
    status: Optional[JobStatus] = None
    quantity: Optional[int] = Field(default=None, gt=0)


class JobRead(JobBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
