"""Tests for database initialization, tables, and model constraints."""

import pytest
from sqlmodel import Session, select
from app.models.machine import Machine
from app.models.job import Job, JobStatus
from app.models.telemetry import Telemetry
from app.models.decision import Decision
from app.models.simulation_run import SimulationRun


def test_database_initialization(session: Session):
    """Test that all foundation tables exist and can be queried."""
    machines = session.exec(select(Machine)).all()
    assert isinstance(machines, list)

    jobs = session.exec(select(Job)).all()
    assert isinstance(jobs, list)

    telemetry = session.exec(select(Telemetry)).all()
    assert isinstance(telemetry, list)

    decisions = session.exec(select(Decision)).all()
    assert isinstance(decisions, list)

    runs = session.exec(select(SimulationRun)).all()
    assert isinstance(runs, list)


def test_machine_creation_and_retrieval(session: Session):
    """Test direct SQLModel machine insertion and retrieval."""
    m = Machine(
        id="TEST-01",
        name="Test Lathe",
        machine_type="CNC Lathe",
        run_power_kw=15.0,
        idle_power_kw=5.0,
        standby_power_kw=1.0,
        off_power_kw=0.1,
        restart_duration_min=6,
        restart_energy_kwh=0.5,
        standby_allowed=True,
        shutdown_allowed=False,
        minimum_off_time_min=10,
        safety_buffer_min=5,
    )
    session.add(m)
    session.commit()

    retrieved = session.get(Machine, "TEST-01")
    assert retrieved is not None
    assert retrieved.name == "Test Lathe"
    assert retrieved.run_power_kw == 15.0
    assert retrieved.restart_duration_min == 6


def test_machine_validation():
    """Verify that negative power and empty names are rejected by validation."""
    with pytest.raises(ValueError, match="Machine name must not be empty"):
        Machine(
            id="BAD-01",
            name="",  # Empty name
            run_power_kw=10.0,
            idle_power_kw=5.0,
            standby_power_kw=1.0,
            restart_duration_min=5,
            restart_energy_kwh=0.5,
        )

    with pytest.raises(ValueError, match="cannot be negative"):
        Machine(
            id="BAD-02",
            name="Valid Name",
            run_power_kw=-5.0,  # Negative power
            idle_power_kw=5.0,
            standby_power_kw=1.0,
            restart_duration_min=5,
            restart_energy_kwh=0.5,
        )


def test_job_creation_and_validation(session: Session):
    """Verify job creation and duration validation."""
    m = Machine(
        id="CNC-M1",
        name="Milling Unit",
        run_power_kw=12.0,
        idle_power_kw=5.0,
        standby_power_kw=1.0,
        restart_duration_min=5,
        restart_energy_kwh=0.4,
    )
    session.add(m)
    session.commit()

    job = Job(
        id="JOB-101",
        job_name="Component Machining",
        product_type="Type A",
        machine_id="CNC-M1",
        scheduled_start=30,
        duration_min=60,
        deadline=100,
        status=JobStatus.QUEUED,
        quantity=5,
    )
    session.add(job)
    session.commit()

    saved_job = session.get(Job, "JOB-101")
    assert saved_job is not None
    assert saved_job.duration_min == 60
    assert saved_job.quantity == 5

    # Non-positive duration validation
    with pytest.raises(ValueError, match="greater than 0"):
        Job(
            id="BAD-JOB",
            job_name="Invalid Job",
            machine_id="CNC-M1",
            scheduled_start=10,
            duration_min=0,  # Invalid
            deadline=50,
            quantity=1,
        )
