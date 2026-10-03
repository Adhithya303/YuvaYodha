"""Simulation API endpoints."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.database import get_session
from app.models.simulation_run import StrategyType, SimulationRun
from app.models.telemetry import Telemetry
from app.models.decision import Decision
from app.services.simulation.decision import StrategyConfig
from app.services.simulation.scenario import list_scenarios, ScenarioOverrides
from app.services.simulation.engine import SimulationResult
from app.services.playback import (
    PlaybackResponse,
    build_playback_response,
    stream_playback_frames,
)
from app.services.simulation_service import (
    run_and_persist_simulation,
    list_simulation_runs,
    get_simulation_run,
    get_simulation_telemetry,
    get_simulation_decisions,
    compare_simulation_strategies,
)

router = APIRouter(prefix="/simulations", tags=["Simulations"])


class SimulationRunRequest(BaseModel):
    """Payload to trigger a simulation run."""

    scenario_id: str = Field(default="default_shift", description="Target scenario identifier")
    strategy: StrategyType = Field(default=StrategyType.ALWAYS_READY, description="Energy operational strategy")
    strategy_config: Optional[StrategyConfig] = Field(default=None, description="Optional strategy configuration")
    scenario_overrides: Optional[ScenarioOverrides] = Field(default=None, description="Optional What-If parameters without mutating base scenario")


class StrategyComparisonRequest(BaseModel):
    """Payload to trigger multi-strategy comparison."""

    scenario_id: str = Field(default="default_shift", description="Target scenario identifier")
    fixed_timer_threshold_min: int = Field(default=30, ge=1, description="Threshold for Fixed Timer in minutes")
    minimum_saving_kwh: float = Field(default=0.10, ge=0.0, description="Minimum saving threshold in kWh")
    allow_shutdown: bool = Field(default=True, description="Whether shutdown evaluation is enabled")
    scenario_overrides: Optional[ScenarioOverrides] = Field(default=None, description="Optional What-If parameters without mutating base scenario")


@router.get("/scenarios")
def get_available_scenarios():
    """List all pre-configured simulation scenarios."""
    return list_scenarios()


@router.post("/run", response_model=SimulationResult, status_code=status.HTTP_201_CREATED)
def run_simulation(
    payload: SimulationRunRequest,
    session: Session = Depends(get_session),
):
    """Execute a discrete time-step simulation run and persist results."""
    try:
        result = run_and_persist_simulation(
            session=session,
            scenario_id=payload.scenario_id,
            strategy_type=payload.strategy,
            strategy_config=payload.strategy_config,
            scenario_overrides=payload.scenario_overrides,
        )
        return result
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation failed: {str(e)}",
        )


@router.post("/compare", status_code=status.HTTP_200_OK)
def compare_strategies_endpoint(
    payload: StrategyComparisonRequest,
    session: Session = Depends(get_session),
):
    """Execute ALWAYS_READY, FIXED_TIMER, and IDLEWISE side-by-side and return comparative analysis."""
    try:
        comparison_result = compare_simulation_strategies(
            session=session,
            scenario_id=payload.scenario_id,
            fixed_timer_threshold_min=payload.fixed_timer_threshold_min,
            minimum_saving_kwh=payload.minimum_saving_kwh,
            allow_shutdown=payload.allow_shutdown,
            scenario_overrides=payload.scenario_overrides,
        )
        return comparison_result

    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Strategy comparison failed: {str(e)}",
        )


@router.get("", response_model=List[SimulationRun])
def get_simulations_history(
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """List previously executed simulation runs."""
    return list_simulation_runs(session, limit=limit)


@router.get("/{run_id}", response_model=SimulationRun)
def get_simulation_run_details(
    run_id: str,
    session: Session = Depends(get_session),
):
    """Retrieve metadata and aggregated KPIs for a single simulation run."""
    run = get_simulation_run(session, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation run with id '{run_id}' not found",
        )
    return run


@router.get("/{run_id}/telemetry", response_model=List[Telemetry])
def get_simulation_run_telemetry(
    run_id: str,
    machine_id: Optional[str] = Query(default=None),
    start_time: Optional[int] = Query(default=None, ge=0),
    end_time: Optional[int] = Query(default=None, ge=0),
    limit: int = Query(default=1500, ge=1, le=3000),
    session: Session = Depends(get_session),
):
    """Retrieve detailed time-step telemetry records for a simulation run."""
    run = get_simulation_run(session, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation run with id '{run_id}' not found",
        )
    return get_simulation_telemetry(
        session=session,
        run_id=run_id,
        machine_id=machine_id,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
    )


@router.get("/{run_id}/decisions", response_model=List[Decision])
def get_simulation_run_decisions(
    run_id: str,
    machine_id: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    """Retrieve recorded decisions for a simulation run chronologically."""
    run = get_simulation_run(session, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation run with id '{run_id}' not found",
        )
    return get_simulation_decisions(
        session=session,
        run_id=run_id,
        machine_id=machine_id,
    )


@router.get("/{run_id}/playback", response_model=PlaybackResponse)
def get_simulation_run_playback(
    run_id: str,
    start_minute: Optional[int] = Query(default=None, ge=0),
    end_minute: Optional[int] = Query(default=None, ge=0),
    session: Session = Depends(get_session),
):
    """Retrieve complete synchronized playback frames for accelerated virtual shift replay."""
    try:
        return build_playback_response(
            session=session,
            run_id=run_id,
            start_minute=start_minute,
            end_minute=end_minute,
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate playback data: {str(e)}",
        )


@router.get("/{run_id}/stream")
def stream_simulation_run_playback(
    run_id: str,
    speed: int = Query(default=60, ge=1, le=240, description="Playback speed multiplier (1, 10, 60, 120, 240)"),
    session: Session = Depends(get_session),
):
    """Stream telemetry frames as Server-Sent Events (SSE) for live-style playback demonstration."""
    run = get_simulation_run(session, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation run with id '{run_id}' not found",
        )

    return StreamingResponse(
        stream_playback_frames(session=session, run_id=run_id, speed=speed),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
