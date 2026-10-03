"""Production jobs resource endpoints."""

from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models.job import Job
from app.models.machine import Machine
from app.schemas.job import JobCreate, JobRead

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=List[JobRead])
def list_jobs(session: Session = Depends(get_session)):
    """Retrieve all scheduled production jobs."""
    statement = select(Job).order_by(Job.scheduled_start)
    jobs = session.exec(statement).all()
    return jobs


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(payload: JobCreate, session: Session = Depends(get_session)):
    """Schedule a new production job."""
    # Check if job ID already exists
    existing_job = session.get(Job, payload.id)
    if existing_job:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job with id '{payload.id}' already exists",
        )

    # Check target machine existence
    machine = session.get(Machine, payload.machine_id)
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target machine '{payload.machine_id}' does not exist",
        )

    now = datetime.now(timezone.utc)
    job = Job(**payload.model_dump(), created_at=now)
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: str, session: Session = Depends(get_session)):
    """Retrieve details for a single production job."""
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id '{job_id}' not found",
        )
    return job
