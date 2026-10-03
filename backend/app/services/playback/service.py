"""Simulation playback service.

Transforms stored telemetry and decisions into synchronized playback frames
for accelerated simulation replay and live-style streaming.
"""

import asyncio
import json
from typing import List, Optional, Dict, Any, AsyncGenerator
from sqlmodel import Session, select

from app.models.simulation_run import SimulationRun, StrategyType
from app.models.telemetry import Telemetry, MachineState
from app.models.decision import Decision
from app.models.machine import Machine
from app.services.simulation.clock import minute_to_time_str
from app.services.simulation.scenario import get_scenario, list_scenarios, ScenarioDefinition
from app.services.playback.schemas import (
    PlaybackMachineStatic,
    PlaybackMachineState,
    PlaybackDecisionEvent,
    PlaybackCumulative,
    PlaybackFrame,
    PlaybackResponse,
)


def _resolve_scenario(scenario_name: str) -> ScenarioDefinition:
    """Resolve scenario definition by name or fallback to default shift."""
    available = list_scenarios()
    for sc_info in available:
        if sc_info["name"] == scenario_name or sc_info["id"] == scenario_name:
            return get_scenario(sc_info["id"])
    return get_scenario("default_shift")


def build_playback_response(
    session: Session,
    run_id: str,
    start_minute: Optional[int] = None,
    end_minute: Optional[int] = None,
) -> PlaybackResponse:
    """Build deterministic playback frames from persisted SQLite telemetry and decisions."""
    # 1. Fetch SimulationRun
    run = session.get(SimulationRun, run_id)
    if not run:
        raise KeyError(f"Simulation run with id '{run_id}' not found")

    # 2. Resolve Scenario metadata
    scenario = _resolve_scenario(run.scenario_name)
    total_shift_minutes = scenario.shift_minutes
    tariff = scenario.electricity_tariff_per_kwh

    # 3. Load static machine specifications
    static_machines: List[PlaybackMachineStatic] = [
        PlaybackMachineStatic(
            id=m.id,
            name=m.name,
            machine_type=m.machine_type,
            run_power_kw=m.run_power_kw,
            idle_power_kw=m.idle_power_kw,
            standby_power_kw=m.standby_power_kw,
            off_power_kw=m.off_power_kw,
            restart_duration_min=m.restart_duration_min,
            safety_buffer_min=m.safety_buffer_min,
        )
        for m in scenario.machines
    ]
    machine_map = {m.id: m for m in scenario.machines}

    # 4. Fetch telemetry records for this run ordered by minute and machine
    telemetry_query = (
        select(Telemetry)
        .where(Telemetry.simulation_run_id == run_id)
        .order_by(Telemetry.timestamp, Telemetry.machine_id)
    )
    telemetry_rows: List[Telemetry] = session.exec(telemetry_query).all()

    # 5. Fetch decisions for this run ordered by timestamp
    decision_query = (
        select(Decision)
        .where(Decision.simulation_run_id == run_id)
        .order_by(Decision.timestamp, Decision.machine_id)
    )
    decision_rows: List[Decision] = session.exec(decision_query).all()

    # Group decisions by minute timestamp
    decisions_by_minute: Dict[int, List[PlaybackDecisionEvent]] = {}
    for d in decision_rows:
        event = PlaybackDecisionEvent(
            timestamp=d.timestamp,
            time_str=minute_to_time_str(d.timestamp, 8),
            machine_id=d.machine_id,
            recommended_action=d.recommended_action,
            idle_window_min=d.idle_window_min,
            estimated_energy_saved_kwh=round(d.estimated_energy_saved_kwh, 4),
            estimated_cost_saved=round(d.estimated_cost_saved, 2),
            production_risk=d.production_risk,
            reason=d.reason,
        )
        decisions_by_minute.setdefault(d.timestamp, []).append(event)

    # Group telemetry by minute
    telemetry_by_minute: Dict[int, List[Telemetry]] = {}
    for row in telemetry_rows:
        telemetry_by_minute.setdefault(row.timestamp, []).append(row)

    # Pre-index jobs by machine to easily identify next job
    jobs_by_machine: Dict[str, list] = {}
    for j in scenario.jobs:
        jobs_by_machine.setdefault(j.machine_id, []).append(j)
    for m_id in jobs_by_machine:
        jobs_by_machine[m_id].sort(key=lambda j: j.scheduled_start)

    # 6. Build sequential playback frames with cumulative progress tracking
    frames: List[PlaybackFrame] = []
    cumulative_energy_kwh = 0.0

    min_step = 0
    max_step = total_shift_minutes

    for minute in range(min_step, max_step):
        rows = telemetry_by_minute.get(minute, [])
        machine_states: List[PlaybackMachineState] = []
        step_energy_kwh = 0.0
        factory_power_kw = 0.0

        for row in rows:
            power = row.power_kw
            factory_power_kw += power
            step_energy_kwh += power * (1.0 / 60.0)

            # Find next scheduled job on this machine
            m_jobs = jobs_by_machine.get(row.machine_id, [])
            next_j = next((j for j in m_jobs if j.scheduled_start > minute), None)
            next_job_id = next_j.id if next_j else None
            next_job_start = minute_to_time_str(next_j.scheduled_start, 8) if next_j else None

            # Context note
            m_spec = machine_map.get(row.machine_id)
            safety_buf = m_spec.safety_buffer_min if m_spec else 5
            context_note: Optional[str] = None

            if row.machine_state == MachineState.RUNNING:
                context_note = f"Processing {row.active_job_id or 'production'}"
            elif row.machine_state == MachineState.STARTING:
                context_note = "Warmup & restart in progress"
            elif row.machine_state == MachineState.STANDBY:
                context_note = "Energy-saving standby active"
            elif row.machine_state == MachineState.OFF:
                context_note = "IdleWise shutdown active"
            elif row.machine_state == MachineState.IDLE_READY:
                if next_j and minute >= (next_j.scheduled_start - safety_buf):
                    context_note = "Safety buffer active - ready for production"
                else:
                    context_note = "Idle ready - waiting for job"

            machine_states.append(
                PlaybackMachineState(
                    machine_id=row.machine_id,
                    state=row.machine_state,
                    power_kw=round(power, 2),
                    active_job_id=row.active_job_id,
                    next_job_id=next_job_id,
                    next_job_start=next_job_start,
                    context_note=context_note,
                )
            )

        cumulative_energy_kwh += step_energy_kwh

        # Determine jobs completed and units produced by end of this minute interval
        jobs_completed_count = 0
        units_produced_count = 0
        current_minute_end = minute + 1

        for j in scenario.jobs:
            job_finish = j.scheduled_start + j.duration_min
            if job_finish <= current_minute_end:
                jobs_completed_count += 1
                units_produced_count += j.quantity

        sim_time = minute_to_time_str(minute, 8)
        progress = round((minute + 1) / total_shift_minutes * 100.0, 1)

        frame_decisions = decisions_by_minute.get(minute, [])

        frame = PlaybackFrame(
            minute_index=minute,
            simulation_time=sim_time,
            progress_percent=progress,
            machines=machine_states,
            decisions=frame_decisions,
            cumulative=PlaybackCumulative(
                energy_kwh=round(cumulative_energy_kwh, 4),
                cost=round(cumulative_energy_kwh * tariff, 2),
                jobs_completed=jobs_completed_count,
                units_produced=units_produced_count,
                factory_power_kw=round(factory_power_kw, 2),
            ),
        )

        frames.append(frame)

    # Optional slice filtering for future zoom/scrubbing API optimizations
    if start_minute is not None or end_minute is not None:
        s = start_minute if start_minute is not None else 0
        e = end_minute if end_minute is not None else len(frames)
        filtered_frames = [f for f in frames if s <= f.minute_index <= e]
    else:
        filtered_frames = frames

    total_units = sum(j.quantity for j in scenario.jobs)
    final_summary = {
        "total_energy_kwh": run.total_energy_kwh,
        "total_cost": run.total_cost,
        "jobs_completed": run.jobs_completed,
        "late_jobs": run.late_jobs,
        "total_units_produced": total_units,
        "production_preserved": run.late_jobs == 0 and run.jobs_completed == len(scenario.jobs),
    }

    return PlaybackResponse(
        run_id=run.id,
        scenario_id=scenario.id,
        strategy=run.strategy,
        shift_start=scenario.shift_start_time,
        shift_end=scenario.shift_end_time,
        total_frames=len(filtered_frames),
        machines=static_machines,
        frames=filtered_frames,
        final_summary=final_summary,
    )


async def stream_playback_frames(
    session: Session,
    run_id: str,
    speed: int = 60,
) -> AsyncGenerator[str, None]:
    """Async generator streaming telemetry frames as Server-Sent Events (SSE)."""
    allowed_speeds = [1, 10, 60, 120, 240]
    if speed not in allowed_speeds:
        speed = 60

    # Calculate real delay between frame emissions
    # 240x speed -> 0.005s per frame
    # 60x speed -> 0.02s per frame
    frame_delay = max(0.005, 1.0 / float(speed))

    playback_data = build_playback_response(session=session, run_id=run_id)

    # Emit initial run metadata event
    init_payload = {
        "run_id": playback_data.run_id,
        "strategy": playback_data.strategy,
        "total_frames": playback_data.total_frames,
        "shift_start": playback_data.shift_start,
        "shift_end": playback_data.shift_end,
    }
    yield f"event: init\ndata: {json.dumps(init_payload)}\n\n"

    for frame in playback_data.frames:
        yield f"event: frame\ndata: {frame.model_dump_json()}\n\n"

        if frame.decisions:
            for d in frame.decisions:
                yield f"event: decision\ndata: {d.model_dump_json()}\n\n"

        await asyncio.sleep(frame_delay)

    # Emit completion event
    yield f"event: completed\ndata: {json.dumps(playback_data.final_summary)}\n\n"
