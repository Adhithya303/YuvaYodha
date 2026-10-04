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


def test_database_url_normalization():
    """Verify postgresql:// URLs are normalized to postgresql+psycopg:// and other URLs remain untouched."""
    from app.database import normalize_database_url

    # Test B: postgresql:// normalized to postgresql+psycopg://
    pg_url = "postgresql://user:secret@ep-cool-db.neon.tech/neondb?sslmode=require"
    assert normalize_database_url(pg_url) == "postgresql+psycopg://user:secret@ep-cool-db.neon.tech/neondb?sslmode=require"

    # Test C: postgresql+psycopg:// not modified
    psycopg_url = "postgresql+psycopg://user:secret@ep-cool-db.neon.tech/neondb"
    assert normalize_database_url(psycopg_url) == psycopg_url

    # SQLite URL not modified
    sqlite_url = "sqlite:///./data/idlewise.db"
    assert normalize_database_url(sqlite_url) == sqlite_url


def test_sqlite_engine_configuration():
    """Test A: SQLite URL creates an engine with check_same_thread=False connect_args."""
    from unittest.mock import patch
    from app.database import create_database_engine

    with patch("app.database.create_engine") as mock_create:
        create_database_engine("sqlite:///./data/test.db")
        mock_create.assert_called_once()
        args, kwargs = mock_create.call_args
        assert args[0] == "sqlite:///./data/test.db"
        assert kwargs.get("connect_args") == {"check_same_thread": False}


def test_postgresql_engine_configuration():
    """Test D: PostgreSQL engine receives pool_pre_ping=True and does NOT receive check_same_thread."""
    from unittest.mock import patch
    from app.database import create_database_engine

    with patch("app.database.create_engine") as mock_create:
        create_database_engine("postgresql://user:pass@ep-demo.neon.tech/neondb?sslmode=require")
        mock_create.assert_called_once()
        args, kwargs = mock_create.call_args
        # Normalized URL with driver
        assert args[0] == "postgresql+psycopg://user:pass@ep-demo.neon.tech/neondb?sslmode=require"
        # pool_pre_ping is True
        assert kwargs.get("pool_pre_ping") is True
        # connect_args should not contain check_same_thread
        connect_args = kwargs.get("connect_args", {})
        assert "check_same_thread" not in connect_args


def test_database_info_security():
    """Verify get_database_info does not leak sensitive credentials."""
    from app.database import get_database_info

    info = get_database_info()
    assert "dialect" in info
    assert "is_sqlite" in info
    assert "password" not in str(info).lower()

