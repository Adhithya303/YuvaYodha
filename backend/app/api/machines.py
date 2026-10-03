"""Machine resource endpoints."""

from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models.machine import Machine
from app.schemas.machine import MachineCreate, MachineRead

router = APIRouter(prefix="/machines", tags=["Machines"])


@router.get("", response_model=List[MachineRead])
def list_machines(session: Session = Depends(get_session)):
    """Retrieve all configured manufacturing machines."""
    statement = select(Machine).order_by(Machine.id)
    machines = session.exec(statement).all()
    return machines


@router.post("", response_model=MachineRead, status_code=status.HTTP_201_CREATED)
def create_machine(payload: MachineCreate, session: Session = Depends(get_session)):
    """Create a new machine specification with energy characteristics."""
    existing = session.get(Machine, payload.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Machine with id '{payload.id}' already exists",
        )

    now = datetime.now(timezone.utc)
    machine = Machine(**payload.model_dump(), created_at=now, updated_at=now)
    session.add(machine)
    session.commit()
    session.refresh(machine)
    return machine


@router.get("/{machine_id}", response_model=MachineRead)
def get_machine(machine_id: str, session: Session = Depends(get_session)):
    """Retrieve a single machine by ID."""
    machine = session.get(Machine, machine_id)
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id '{machine_id}' not found",
        )
    return machine
