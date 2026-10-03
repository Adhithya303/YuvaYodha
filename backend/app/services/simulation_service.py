"""Simulation application service and database persistence management."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select

from app.models.simulation_run import SimulationRun, StrategyType, SimulationStatus
from app.models.telemetry import Telemetry, MachineState
from app.models.decision import Decision
from app.services.simulation.decision import StrategyConfig
from app.services.simulation.engine import SimulationEngine, SimulationResult
from app.services.simulation.scenario import (
    get_scenario,
    ScenarioDefinition,
    ScenarioOverrides,
    create_overridden_scenario,
)


def run_and_persist_simulation(
    session: Session,
    scenario_id: str = "default_shift",
    strategy_type: StrategyType = StrategyType.ALWAYS_READY,
    strategy_config: Optional[StrategyConfig] = None,
    scenario_overrides: Optional[ScenarioOverrides] = None,
) -> SimulationResult:
    """Execute scenario simulation and persist SimulationRun, Telemetry, and Decisions to SQLite."""
    scenario: ScenarioDefinition = get_scenario(scenario_id)
    if scenario_overrides:
        scenario = create_overridden_scenario(scenario, scenario_overrides)

    engine = SimulationEngine(
        scenario=scenario,
        strategy_type=strategy_type,
        strategy_config=strategy_config,
    )
    now_started = datetime.now(timezone.utc)

    # Create pending SimulationRun record in DB
    db_run = SimulationRun(
        id=engine.run_id,
        scenario_name=scenario.name,
        strategy=strategy_type,
        status=SimulationStatus.RUNNING,
        started_at=now_started,
    )
    session.add(db_run)
    session.commit()

    try:
        # Execute discrete time-step simulation
        result: SimulationResult = engine.run()

        # Update SimulationRun with completed outcomes
        now_completed = datetime.now(timezone.utc)
        db_run.status = SimulationStatus.COMPLETED
        db_run.total_energy_kwh = result.total_energy_kwh
        db_run.total_cost = result.total_cost
        db_run.jobs_completed = result.jobs_completed
        db_run.late_jobs = result.late_jobs
        db_run.total_delay_minutes = result.total_delay_minutes
        db_run.energy_per_unit = result.energy_per_unit
        db_run.completed_at = now_completed
        session.add(db_run)

        # Bulk insert telemetry records
        telemetry_objects = [
            Telemetry(
                timestamp=row["timestamp"],
                machine_id=row["machine_id"],
                machine_state=row["machine_state"],
                power_kw=row["power_kw"],
                active_job_id=row["active_job_id"],
                simulation_run_id=result.simulation_run_id,
            )
            for row in result.telemetry_records
        ]
        session.add_all(telemetry_objects)

        # Bulk insert decision records (Section 50)
        decision_objects = [
            Decision(
                timestamp=d.timestamp,
                machine_id=d.machine_id,
                simulation_run_id=result.simulation_run_id,
                current_state=MachineState.IDLE_READY,
                recommended_action=d.recommended_action,
                idle_window_min=d.idle_window_min,
                estimated_energy_saved_kwh=d.estimated_energy_saved_kwh,
                estimated_cost_saved=d.estimated_cost_saved,
                production_risk=d.production_risk,
                reason=d.reason,
            )
            for d in result.decisions
        ]
        if decision_objects:
            session.add_all(decision_objects)

        session.commit()
        session.refresh(db_run)

        return result

    except Exception as e:
        session.rollback()
        db_run_fail = session.get(SimulationRun, engine.run_id)
        if db_run_fail:
            db_run_fail.status = SimulationStatus.FAILED
            db_run_fail.completed_at = datetime.now(timezone.utc)
            session.add(db_run_fail)
            session.commit()
        raise e


def list_simulation_runs(session: Session, limit: int = 50) -> List[SimulationRun]:
    """Retrieve history of completed or recorded simulation runs."""
    statement = select(SimulationRun).order_by(SimulationRun.started_at.desc()).limit(limit)
    return session.exec(statement).all()


def get_simulation_run(session: Session, run_id: str) -> Optional[SimulationRun]:
    """Retrieve single simulation run by ID."""
    return session.get(SimulationRun, run_id)


def get_simulation_telemetry(
    session: Session,
    run_id: str,
    machine_id: Optional[str] = None,
    start_time: Optional[int] = None,
    end_time: Optional[int] = None,
    limit: int = 2000,
) -> List[Telemetry]:
    """Query telemetry data for a simulation run with optional filtering."""
    query = select(Telemetry).where(Telemetry.simulation_run_id == run_id)
    if machine_id:
        query = query.where(Telemetry.machine_id == machine_id)
    if start_time is not None:
        query = query.where(Telemetry.timestamp >= start_time)
    if end_time is not None:
        query = query.where(Telemetry.timestamp <= end_time)

    query = query.order_by(Telemetry.timestamp, Telemetry.machine_id).limit(limit)
    return session.exec(query).all()


def get_simulation_decisions(
    session: Session,
    run_id: str,
    machine_id: Optional[str] = None,
) -> List[Decision]:
    """Query recorded decisions for a simulation run ordered chronologically."""
    query = select(Decision).where(Decision.simulation_run_id == run_id)
    if machine_id:
        query = query.where(Decision.machine_id == machine_id)
    query = query.order_by(Decision.timestamp, Decision.machine_id)
    return session.exec(query).all()


def compare_simulation_strategies(
    session: Session,
    scenario_id: str = "default_shift",
    fixed_timer_threshold_min: int = 30,
    minimum_saving_kwh: float = 0.10,
    allow_shutdown: bool = True,
    scenario_overrides: Optional[ScenarioOverrides] = None,
) -> Dict[str, Any]:
    """Execute all three strategies against identical scenario and compute comparative metrics."""
    # 1. Baseline: ALWAYS_READY
    baseline_result = run_and_persist_simulation(
        session=session,
        scenario_id=scenario_id,
        strategy_type=StrategyType.ALWAYS_READY,
        scenario_overrides=scenario_overrides,
    )

    # 2. Conventional Policy: FIXED_TIMER
    fixed_timer_config = StrategyConfig(
        fixed_timer_threshold_min=fixed_timer_threshold_min,
        minimum_saving_kwh=minimum_saving_kwh,
        allow_shutdown=allow_shutdown,
    )
    fixed_timer_result = run_and_persist_simulation(
        session=session,
        scenario_id=scenario_id,
        strategy_type=StrategyType.FIXED_TIMER,
        strategy_config=fixed_timer_config,
        scenario_overrides=scenario_overrides,
    )

    # 3. Intelligent Engine: IDLEWISE
    idlewise_config = StrategyConfig(
        fixed_timer_threshold_min=fixed_timer_threshold_min,
        minimum_saving_kwh=minimum_saving_kwh,
        allow_shutdown=allow_shutdown,
    )
    idlewise_result = run_and_persist_simulation(
        session=session,
        scenario_id=scenario_id,
        strategy_type=StrategyType.IDLEWISE,
        strategy_config=idlewise_config,
        scenario_overrides=scenario_overrides,
    )

    # Comparative mathematics
    base_e = baseline_result.total_energy_kwh
    fixed_e = fixed_timer_result.total_energy_kwh
    iw_e = idlewise_result.total_energy_kwh

    # Savings vs Baseline
    iw_vs_base_saved_kwh = max(0.0, base_e - iw_e)
    iw_vs_base_pct = (iw_vs_base_saved_kwh / base_e * 100.0) if base_e > 0 else 0.0

    ft_vs_base_saved_kwh = max(0.0, base_e - fixed_e)
    ft_vs_base_pct = (ft_vs_base_saved_kwh / base_e * 100.0) if base_e > 0 else 0.0

    # IdleWise vs Fixed Timer
    iw_vs_ft_saved_kwh = fixed_e - iw_e
    iw_vs_ft_pct = (iw_vs_ft_saved_kwh / fixed_e * 100.0) if fixed_e > 0 else 0.0

    cost_saved_iw_vs_base = baseline_result.total_cost - idlewise_result.total_cost
    cost_saved_iw_vs_ft = fixed_timer_result.total_cost - idlewise_result.total_cost

    specific_energy_reduction = baseline_result.energy_per_unit - idlewise_result.energy_per_unit
    prod_diff_units = idlewise_result.total_units_produced - baseline_result.total_units_produced
    late_job_diff = idlewise_result.late_jobs - baseline_result.late_jobs

    production_preserved = (
        baseline_result.total_units_produced == fixed_timer_result.total_units_produced == idlewise_result.total_units_produced
        and baseline_result.jobs_completed == fixed_timer_result.jobs_completed == idlewise_result.jobs_completed
        and idlewise_result.late_jobs == 0
    )

    return {
        "scenario_id": scenario_id,
        "strategies": {
            StrategyType.ALWAYS_READY.value: baseline_result,
            StrategyType.FIXED_TIMER.value: fixed_timer_result,
            StrategyType.IDLEWISE.value: idlewise_result,
        },
        "comparison": {
            "baseline_energy_kwh": round(base_e, 4),
            "fixed_timer_energy_kwh": round(fixed_e, 4),
            "idlewise_energy_kwh": round(iw_e, 4),

            "idlewise_vs_baseline_energy_saved_kwh": round(iw_vs_base_saved_kwh, 4),
            "idlewise_vs_baseline_percent": round(iw_vs_base_pct, 2),

            "fixed_timer_vs_baseline_energy_saved_kwh": round(ft_vs_base_saved_kwh, 4),
            "fixed_timer_vs_baseline_percent": round(ft_vs_base_pct, 2),

            "idlewise_vs_fixed_timer_energy_saved_kwh": round(iw_vs_ft_saved_kwh, 4),
            "idlewise_vs_fixed_timer_percent": round(iw_vs_ft_pct, 2),

            "cost_saved_idlewise_vs_baseline": round(cost_saved_iw_vs_base, 2),
            "cost_saved_idlewise_vs_fixed_timer": round(cost_saved_iw_vs_ft, 2),

            "specific_energy_reduction": round(specific_energy_reduction, 4),
            "production_difference_units": prod_diff_units,
            "late_job_difference": late_job_diff,
            "production_preserved": production_preserved,
        },
    }
