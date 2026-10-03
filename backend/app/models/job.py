"""Job database model and enums."""

from datetime import datetime, timezone
from enum import Enum
from sqlmodel import SQLModel, Field
from sqlalchemy.orm import validates


class JobStatus(str, Enum):
    """Execution status of a production job."""

    QUEUED = "QUEUED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    DELAYED = "DELAYED"


class Job(SQLModel, table=True):
    """Production job scheduled on a specific machine."""

    __tablename__ = "jobs"

    id: str = Field(primary_key=True, index=True, description="Job identifier, e.g. JOB-001")
    job_name: str = Field(index=True, description="Name of the production job")
    product_type: str = Field(default="Product A", description="Type of product manufactured")
    machine_id: str = Field(foreign_key="machines.id", index=True, description="Target machine ID")

    scheduled_start: int = Field(ge=0, description="Scheduled start time in simulation minutes from shift start")
    duration_min: int = Field(gt=0, description="Expected job duration in minutes")
    deadline: int = Field(ge=0, description="Hard deadline time in simulation minutes")
    status: JobStatus = Field(default=JobStatus.QUEUED, description="Current job status")
    quantity: int = Field(default=1, gt=0, description="Number of units produced in this job")

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validates("duration_min")
    def validate_duration_positive(self, key, value):
        if value is not None and int(value) <= 0:
            raise ValueError("Job duration must be greater than 0")
        return int(value) if value is not None else value

    @validates("quantity")
    def validate_quantity_positive(self, key, value):
        if value is not None and int(value) <= 0:
            raise ValueError("Job quantity must be greater than 0")
        return int(value) if value is not None else value
