"""Development database seeding script.

SYNTHETIC DATA DISCLAIMER:
The machine parameters and jobs in this seed dataset are synthetic assumptions created
for simulation testing and do NOT represent actual Schneider Electric equipment or
measured customer machine specifications.
"""

import sys
from datetime import datetime, timezone
from sqlmodel import Session, select
from app.database import engine, init_db
from app.models.machine import Machine
from app.models.job import Job, JobStatus

SYNTHETIC_MACHINES = [
    {
        "id": "CNC-01",
        "name": "CNC Milling Center 1",
        "machine_type": "CNC 3-Axis Milling",
        "run_power_kw": 12.0,
        "idle_power_kw": 6.0,
        "standby_power_kw": 1.0,
        "off_power_kw": 0.1,
        "restart_duration_min": 5,
        "restart_energy_kwh": 0.4,
        "standby_allowed": True,
        "shutdown_allowed": True,
        "minimum_off_time_min": 30,
        "safety_buffer_min": 5,
    },
    {
        "id": "CNC-02",
        "name": "Heavy Duty Milling 2",
        "machine_type": "CNC 5-Axis Milling",
        "run_power_kw": 16.0,
        "idle_power_kw": 8.0,
        "standby_power_kw": 1.5,
        "off_power_kw": 0.1,
        "restart_duration_min": 7,
        "restart_energy_kwh": 0.6,
        "standby_allowed": True,
        "shutdown_allowed": True,
        "minimum_off_time_min": 40,
        "safety_buffer_min": 5,
    },
    {
        "id": "CNC-03",
        "name": "High-Speed Drill & Tap 3",
        "machine_type": "Drilling & Tapping Center",
        "run_power_kw": 10.0,
        "idle_power_kw": 4.5,
        "standby_power_kw": 0.8,
        "off_power_kw": 0.1,
        "restart_duration_min": 4,
        "restart_energy_kwh": 0.3,
        "standby_allowed": True,
        "shutdown_allowed": False,
        "minimum_off_time_min": 0,
        "safety_buffer_min": 4,
    },
]

SAMPLE_JOBS = [
    {
        "id": "JOB-001",
        "job_name": "Precision Enclosure - Batch A1",
        "product_type": "Precision Enclosure",
        "machine_id": "CNC-01",
        "scheduled_start": 10,
        "duration_min": 45,
        "deadline": 70,
        "status": JobStatus.QUEUED,
        "quantity": 10,
    },
    {
        "id": "JOB-002",
        "job_name": "Precision Enclosure - Batch A2",
        "product_type": "Precision Enclosure",
        "machine_id": "CNC-01",
        "scheduled_start": 120,
        "duration_min": 60,
        "deadline": 195,
        "status": JobStatus.QUEUED,
        "quantity": 15,
    },
    {
        "id": "JOB-003",
        "job_name": "Structural Bracket - Batch B1",
        "product_type": "Structural Bracket",
        "machine_id": "CNC-02",
        "scheduled_start": 15,
        "duration_min": 50,
        "deadline": 80,
        "status": JobStatus.QUEUED,
        "quantity": 8,
    },
    {
        "id": "JOB-004",
        "job_name": "Structural Bracket - Batch B2",
        "product_type": "Structural Bracket",
        "machine_id": "CNC-02",
        "scheduled_start": 160,
        "duration_min": 80,
        "deadline": 260,
        "status": JobStatus.QUEUED,
        "quantity": 12,
    },
    {
        "id": "JOB-005",
        "job_name": "Sensor Mount Plate - Batch S1",
        "product_type": "Precision Enclosure",
        "machine_id": "CNC-03",
        "scheduled_start": 30,
        "duration_min": 40,
        "deadline": 85,
        "status": JobStatus.QUEUED,
        "quantity": 20,
    },
    {
        "id": "JOB-006",
        "job_name": "Motor Flange Adapter - Batch M1",
        "product_type": "Structural Bracket",
        "machine_id": "CNC-03",
        "scheduled_start": 130,
        "duration_min": 55,
        "deadline": 200,
        "status": JobStatus.QUEUED,
        "quantity": 16,
    },
]


def seed_database():
    """Populate database with synthetic machine configurations and test jobs."""
    init_db()
    now = datetime.now(timezone.utc)

    with Session(engine) as session:
        # Seed Machines
        seeded_machines = 0
        for m_data in SYNTHETIC_MACHINES:
            existing = session.get(Machine, m_data["id"])
            if not existing:
                machine = Machine(**m_data, created_at=now, updated_at=now)
                session.add(machine)
                seeded_machines += 1
            else:
                for k, v in m_data.items():
                    setattr(existing, k, v)
                existing.updated_at = now
                session.add(existing)

        session.commit()
        print(f"Successfully seeded {len(SYNTHETIC_MACHINES)} machines ({seeded_machines} new).")

        # Seed Sample Jobs
        seeded_jobs = 0
        for j_data in SAMPLE_JOBS:
            existing = session.get(Job, j_data["id"])
            if not existing:
                job = Job(**j_data, created_at=now)
                session.add(job)
                seeded_jobs += 1
            else:
                for k, v in j_data.items():
                    setattr(existing, k, v)
                session.add(existing)

        session.commit()
        print(f"Successfully seeded {len(SAMPLE_JOBS)} sample jobs ({seeded_jobs} new).")


if __name__ == "__main__":
    print("Seeding IdleWise SQLite database...")
    seed_database()
    print("Seeding complete.")
