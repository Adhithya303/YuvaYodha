"""Simulation scenario definitions and validation logic."""

from typing import List, Dict, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class ScenarioMachine(BaseModel):
    """Machine configuration specification for a scenario."""

    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    machine_type: str = Field(default="CNC Machine")
    run_power_kw: float = Field(..., ge=0.0)
    idle_power_kw: float = Field(..., ge=0.0)
    standby_power_kw: float = Field(..., ge=0.0)
    off_power_kw: float = Field(default=0.0, ge=0.0)
    restart_duration_min: int = Field(..., ge=0)
    restart_energy_kwh: float = Field(..., ge=0.0)
    standby_allowed: bool = Field(default=True)
    shutdown_allowed: bool = Field(default=False)
    minimum_off_time_min: int = Field(default=0, ge=0)
    safety_buffer_min: int = Field(default=5, ge=0)

    model_config = ConfigDict(from_attributes=True)


class ScenarioJob(BaseModel):
    """Scheduled production job specification for a scenario."""

    id: str = Field(..., min_length=1)
    job_name: str = Field(..., min_length=1)
    product_type: str = Field(default="Product A")
    machine_id: str = Field(..., min_length=1)
    scheduled_start: int = Field(..., ge=0, description="Scheduled start minute from shift start (0-480)")
    duration_min: int = Field(..., gt=0, description="Job processing duration in minutes")
    deadline: int = Field(..., ge=0, description="Job deadline in simulation minutes")
    quantity: int = Field(default=1, gt=0, description="Finished units produced")

    model_config = ConfigDict(from_attributes=True)


class ScenarioDefinition(BaseModel):
    """Complete factory shift scenario configuration."""

    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str = Field(default="")
    shift_minutes: int = Field(default=480, gt=0)
    shift_start_time: str = Field(default="08:00")
    shift_end_time: str = Field(default="16:00")
    electricity_tariff_per_kwh: float = Field(default=8.0, ge=0.0, description="Cost per kWh (INR / flat tariff)")
    currency: str = Field(default="INR")

    machines: List[ScenarioMachine] = Field(default_factory=list)
    jobs: List[ScenarioJob] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class MachineOverride(BaseModel):
    """Temporary parameter overrides for a specific machine in What-If experiments."""

    idle_power_kw: Optional[float] = Field(default=None, ge=0.0)
    standby_power_kw: Optional[float] = Field(default=None, ge=0.0)
    restart_duration_min: Optional[int] = Field(default=None, ge=0)
    safety_buffer_min: Optional[int] = Field(default=None, ge=0)

    model_config = ConfigDict(from_attributes=True)


class ScenarioOverrides(BaseModel):
    """Temporary parameters for What-If sandbox simulations without mutating base scenarios."""

    electricity_tariff_per_kwh: Optional[float] = Field(default=None, ge=0.0)
    machines: Optional[Dict[str, MachineOverride]] = Field(default=None)

    model_config = ConfigDict(from_attributes=True)



def validate_scenario(scenario: ScenarioDefinition) -> None:
    """Validate that scenario is feasible and contains no scheduling conflicts.

    Raises:
        ValueError: If machines are missing, jobs overlap, or job bounds exceed shift limits.
    """
    if scenario.shift_minutes <= 0:
        raise ValueError("Scenario shift_minutes must be greater than 0")

    if not scenario.machines:
        raise ValueError("Scenario must define at least one machine")

    machine_ids = set()
    for m in scenario.machines:
        if m.id in machine_ids:
            raise ValueError(f"Duplicate machine ID '{m.id}' in scenario")
        machine_ids.add(m.id)

    if not scenario.jobs:
        raise ValueError("Scenario must define at least one production job")

    job_ids = set()
    for job in scenario.jobs:
        if job.id in job_ids:
            raise ValueError(f"Duplicate job ID '{job.id}' in scenario")
        job_ids.add(job.id)

        if job.machine_id not in machine_ids:
            raise ValueError(
                f"Job '{job.id}' references nonexistent machine '{job.machine_id}'. "
                f"Configured machines: {list(machine_ids)}"
            )

        if job.duration_min <= 0:
            raise ValueError(f"Job '{job.id}' has non-positive duration {job.duration_min}")

        if job.scheduled_start < 0:
            raise ValueError(f"Job '{job.id}' scheduled_start cannot be negative")

        job_end = job.scheduled_start + job.duration_min
        if job_end > scenario.shift_minutes:
            raise ValueError(
                f"Job '{job.id}' extends beyond shift boundary: "
                f"end minute {job_end} > shift {scenario.shift_minutes} minutes"
            )

        if job.deadline < job.scheduled_start:
            raise ValueError(
                f"Job '{job.id}' deadline ({job.deadline}) is earlier than scheduled start ({job.scheduled_start})"
            )

    # Detect overlapping jobs on the same machine
    jobs_by_machine: Dict[str, List[ScenarioJob]] = {m_id: [] for m_id in machine_ids}
    for job in scenario.jobs:
        jobs_by_machine[job.machine_id].append(job)

    for m_id, machine_job_list in jobs_by_machine.items():
        # Sort jobs by scheduled start
        sorted_jobs = sorted(machine_job_list, key=lambda j: j.scheduled_start)
        for i in range(len(sorted_jobs) - 1):
            curr_job = sorted_jobs[i]
            next_job = sorted_jobs[i + 1]
            curr_end = curr_job.scheduled_start + curr_job.duration_min
            if curr_end > next_job.scheduled_start:
                raise ValueError(
                    f"Job schedule conflict on machine '{m_id}': "
                    f"Job '{curr_job.id}' ({curr_job.scheduled_start}..{curr_end}) overlaps with "
                    f"Job '{next_job.id}' starting at {next_job.scheduled_start}"
                )


# ==============================================================================
# DEFAULT DEMONSTRATION SCENARIO (Section 18)
# 3 CNC Machines, 2 Products, 12 Jobs across 480-minute Shift (08:00 - 16:00)
# ==============================================================================

DEFAULT_MACHINES = [
    ScenarioMachine(
        id="CNC-01",
        name="CNC Milling Center 1",
        machine_type="CNC 3-Axis Milling",
        run_power_kw=12.0,
        idle_power_kw=6.0,
        standby_power_kw=1.0,
        off_power_kw=0.1,
        restart_duration_min=5,
        restart_energy_kwh=0.4,
        standby_allowed=True,
        shutdown_allowed=True,
        minimum_off_time_min=30,
        safety_buffer_min=5,
    ),
    ScenarioMachine(
        id="CNC-02",
        name="Heavy Duty Milling 2",
        machine_type="CNC 5-Axis Milling",
        run_power_kw=16.0,
        idle_power_kw=8.0,
        standby_power_kw=1.5,
        off_power_kw=0.1,
        restart_duration_min=7,
        restart_energy_kwh=0.6,
        standby_allowed=True,
        shutdown_allowed=True,
        minimum_off_time_min=40,
        safety_buffer_min=5,
    ),
    ScenarioMachine(
        id="CNC-03",
        name="High-Speed Drill & Tap 3",
        machine_type="Drilling & Tapping Center",
        run_power_kw=10.0,
        idle_power_kw=4.5,
        standby_power_kw=0.8,
        off_power_kw=0.1,
        restart_duration_min=4,
        restart_energy_kwh=0.3,
        standby_allowed=True,
        shutdown_allowed=False,
        minimum_off_time_min=0,
        safety_buffer_min=4,
    ),
]

DEFAULT_JOBS = [
    # CNC-01 Jobs: Short, medium, and extended idle windows
    ScenarioJob(
        id="JOB-101",
        job_name="Precision Housing - Part A",
        product_type="Product A",
        machine_id="CNC-01",
        scheduled_start=0,      # 08:00
        duration_min=45,        # 08:00 - 08:45
        deadline=75,            # 09:15
        quantity=10,
    ),
    ScenarioJob(
        id="JOB-102",
        job_name="Electronic Chassis - Part B",
        product_type="Product B",
        machine_id="CNC-01",
        scheduled_start=80,     # 09:20 (Idle window 08:45-09:20: 35 min)
        duration_min=40,        # 09:20 - 10:00
        deadline=150,           # 10:30
        quantity=8,
    ),
    ScenarioJob(
        id="JOB-103",
        job_name="Precision Housing - Part A",
        product_type="Product A",
        machine_id="CNC-01",
        scheduled_start=180,    # 11:00 (Idle window 10:00-11:00: 60 min)
        duration_min=50,        # 11:00 - 11:50
        deadline=255,           # 12:15
        quantity=12,
    ),
    ScenarioJob(
        id="JOB-104",
        job_name="Electronic Chassis - Part B",
        product_type="Product B",
        machine_id="CNC-01",
        scheduled_start=300,    # 13:00 (Idle window 11:50-13:00: 70 min)
        duration_min=45,        # 13:00 - 13:45
        deadline=375,           # 14:15
        quantity=10,
    ),
    # Post-job idle on CNC-01: 13:45 - 16:00 (135 min)

    # CNC-02 Jobs
    ScenarioJob(
        id="JOB-201",
        job_name="Structural Bracket - Part B",
        product_type="Product B",
        machine_id="CNC-02",
        scheduled_start=10,     # 08:10 (Idle window 08:00-08:10: 10 min)
        duration_min=50,        # 08:10 - 09:00
        deadline=90,            # 09:30
        quantity=10,
    ),
    ScenarioJob(
        id="JOB-202",
        job_name="Motor Casing - Part A",
        product_type="Product A",
        machine_id="CNC-02",
        scheduled_start=100,    # 09:40 (Idle window 09:00-09:40: 40 min)
        duration_min=50,        # 09:40 - 10:30
        deadline=180,           # 11:00
        quantity=15,
    ),
    ScenarioJob(
        id="JOB-203",
        job_name="Motor Casing - Part A",
        product_type="Product A",
        machine_id="CNC-02",
        scheduled_start=240,    # 12:00 (Idle window 10:30-12:00: 90 min)
        duration_min=60,        # 12:00 - 13:00
        deadline=330,           # 13:30
        quantity=12,
    ),
    ScenarioJob(
        id="JOB-204",
        job_name="Structural Bracket - Part B",
        product_type="Product B",
        machine_id="CNC-02",
        scheduled_start=375,    # 14:15 (Idle window 13:00-14:15: 75 min)
        duration_min=45,        # 14:15 - 15:00
        deadline=450,           # 15:30
        quantity=8,
    ),
    # Post-job idle on CNC-02: 15:00 - 16:00 (60 min)

    # CNC-03 Jobs
    ScenarioJob(
        id="JOB-301",
        job_name="Sensor Plate - Part A",
        product_type="Product A",
        machine_id="CNC-03",
        scheduled_start=0,      # 08:00
        duration_min=30,        # 08:00 - 08:30
        deadline=45,            # 08:45
        quantity=15,
    ),
    ScenarioJob(
        id="JOB-302",
        job_name="Sensor Plate - Part A",
        product_type="Product A",
        machine_id="CNC-03",
        scheduled_start=60,     # 09:00 (Idle window 08:30-09:00: 30 min)
        duration_min=40,        # 09:00 - 09:40
        deadline=135,           # 10:15
        quantity=20,
    ),
    ScenarioJob(
        id="JOB-303",
        job_name="Mount Flange - Part B",
        product_type="Product B",
        machine_id="CNC-03",
        scheduled_start=150,    # 10:30 (Idle window 09:40-10:30: 50 min)
        duration_min=50,        # 10:30 - 11:20
        deadline=240,           # 12:00
        quantity=16,
    ),
    ScenarioJob(
        id="JOB-304",
        job_name="Sensor Plate - Part A",
        product_type="Product A",
        machine_id="CNC-03",
        scheduled_start=330,    # 13:30 (Idle window 11:20-13:30: 130 min)
        duration_min=50,        # 13:30 - 14:20
        deadline=420,           # 15:00
        quantity=14,
    ),
    # Post-job idle on CNC-03: 14:20 - 16:00 (100 min)
]

DEFAULT_SHIFT_SCENARIO = ScenarioDefinition(
    id="default_shift",
    name="Default CNC Workshop Shift",
    description="Standard 8-hour production shift across 3 CNC machining centers with 12 scheduled jobs and diverse idle windows.",
    shift_minutes=480,
    shift_start_time="08:00",
    shift_end_time="16:00",
    electricity_tariff_per_kwh=8.0,
    currency="INR",
    machines=DEFAULT_MACHINES,
    jobs=DEFAULT_JOBS,
)

# ------------------------------------------------------------------------------
# BENCHMARK EVALUATION SCENARIOS (Section 37)
# ------------------------------------------------------------------------------

SCENARIO_SHORT_GAP = ScenarioDefinition(
    id="scenario_short_gap",
    name="Short Idle Gap Benchmark",
    description="Validates IdleWise KEEP_READY decision when idle gap (8 min) is smaller than restart + buffer (10 min).",
    shift_minutes=60,
    shift_start_time="08:00",
    shift_end_time="09:00",
    electricity_tariff_per_kwh=8.0,
    currency="INR",
    machines=[DEFAULT_MACHINES[0]],  # CNC-01 (R=5, B=5)
    jobs=[
        ScenarioJob(
            id="SHORT-J1",
            job_name="Part A Initial",
            product_type="Product A",
            machine_id="CNC-01",
            scheduled_start=0,
            duration_min=20,
            deadline=30,
            quantity=5,
        ),
        ScenarioJob(
            id="SHORT-J2",
            job_name="Part A Next",
            product_type="Product A",
            machine_id="CNC-01",
            scheduled_start=28,  # Gap = 28 - 20 = 8 min (<= 10 min)
            duration_min=20,
            deadline=60,
            quantity=5,
        ),
    ],
)

SCENARIO_MEDIUM_GAP = ScenarioDefinition(
    id="scenario_medium_gap",
    name="Medium Idle Gap Benchmark",
    description="Validates IdleWise STANDBY decision when a safe 35-min gap permits energy-positive standby while shutdown is restricted by min off time (30 min).",
    shift_minutes=120,
    shift_start_time="08:00",
    shift_end_time="10:00",
    electricity_tariff_per_kwh=8.0,
    currency="INR",
    machines=[DEFAULT_MACHINES[0]],  # CNC-01 (R=5, B=5, min_off=30)
    jobs=[
        ScenarioJob(
            id="MED-J1",
            job_name="Part A Initial",
            product_type="Product A",
            machine_id="CNC-01",
            scheduled_start=0,
            duration_min=20,
            deadline=30,
            quantity=5,
        ),
        ScenarioJob(
            id="MED-J2",
            job_name="Part A Next",
            product_type="Product A",
            machine_id="CNC-01",
            scheduled_start=55,  # Gap = 55 - 20 = 35 min (available off = 25 min < 30 min required)
            duration_min=25,
            deadline=100,
            quantity=5,
        ),
    ],
)


SCENARIO_LONG_GAP = ScenarioDefinition(
    id="scenario_long_gap",
    name="Long Idle Gap Benchmark",
    description="Validates IdleWise SHUTDOWN decision when a 90-min gap exceeds machine minimum off-time (30 min).",
    shift_minutes=180,
    shift_start_time="08:00",
    shift_end_time="11:00",
    electricity_tariff_per_kwh=8.0,
    currency="INR",
    machines=[DEFAULT_MACHINES[0]],  # CNC-01 (R=5, B=5, shutdown_allowed=True, min_off=30)
    jobs=[
        ScenarioJob(
            id="LONG-J1",
            job_name="Part A Initial",
            product_type="Product A",
            machine_id="CNC-01",
            scheduled_start=0,
            duration_min=20,
            deadline=30,
            quantity=5,
        ),
        ScenarioJob(
            id="LONG-J2",
            job_name="Part A Next",
            product_type="Product A",
            machine_id="CNC-01",
            scheduled_start=110,  # Gap = 110 - 20 = 90 min (off duration = 80 min >= 30 min)
            duration_min=30,
            deadline=160,
            quantity=5,
        ),
    ],
)

SCENARIO_HIGH_RESTART_ENERGY = ScenarioDefinition(
    id="scenario_high_restart_energy",
    name="High Restart Energy Benchmark",
    description="Demonstrates why fixed timer fails: machine with 5 kWh restart penalty loses energy in standby, IdleWise keeps ready.",
    shift_minutes=120,
    shift_start_time="08:00",
    shift_end_time="10:00",
    electricity_tariff_per_kwh=8.0,
    currency="INR",
    machines=[
        ScenarioMachine(
            id="CNC-HEAVY-START",
            name="Heavy Hydraulic Milling Center",
            machine_type="Heavy CNC Milling",
            run_power_kw=14.0,
            idle_power_kw=4.0,
            standby_power_kw=2.0,
            off_power_kw=0.2,
            restart_duration_min=5,
            restart_energy_kwh=5.0,  # High restart penalty
            standby_allowed=True,
            shutdown_allowed=False,
            minimum_off_time_min=0,
            safety_buffer_min=5,
        )
    ],
    jobs=[
        ScenarioJob(
            id="HEAVY-J1",
            job_name="Heavy Block Initial",
            product_type="Product B",
            machine_id="CNC-HEAVY-START",
            scheduled_start=0,
            duration_min=20,
            deadline=30,
            quantity=4,
        ),
        ScenarioJob(
            id="HEAVY-J2",
            job_name="Heavy Block Next",
            product_type="Product B",
            machine_id="CNC-HEAVY-START",
            scheduled_start=60,  # Gap = 60 - 20 = 40 min (> 30 min threshold)
            duration_min=30,
            deadline=100,
            quantity=4,
        ),
    ],
)

# Scenario Registry
SCENARIO_REGISTRY: Dict[str, ScenarioDefinition] = {
    DEFAULT_SHIFT_SCENARIO.id: DEFAULT_SHIFT_SCENARIO,
    SCENARIO_SHORT_GAP.id: SCENARIO_SHORT_GAP,
    SCENARIO_MEDIUM_GAP.id: SCENARIO_MEDIUM_GAP,
    SCENARIO_LONG_GAP.id: SCENARIO_LONG_GAP,
    SCENARIO_HIGH_RESTART_ENERGY.id: SCENARIO_HIGH_RESTART_ENERGY,
}


def get_scenario(scenario_id: str) -> ScenarioDefinition:
    """Retrieve scenario definition by ID."""
    if scenario_id not in SCENARIO_REGISTRY:
        raise KeyError(
            f"Scenario '{scenario_id}' not found. Available scenarios: {list(SCENARIO_REGISTRY.keys())}"
        )
    return SCENARIO_REGISTRY[scenario_id]


def create_overridden_scenario(
    base_scenario: ScenarioDefinition,
    overrides: Optional[ScenarioOverrides] = None,
) -> ScenarioDefinition:
    """Create a temporary deeply-copied scenario with applied overrides.
    
    Guarantees the registered base scenario in SCENARIO_REGISTRY is never mutated.
    """
    if not overrides:
        return base_scenario

    cloned = base_scenario.model_copy(deep=True)

    if overrides.electricity_tariff_per_kwh is not None:
        cloned.electricity_tariff_per_kwh = float(overrides.electricity_tariff_per_kwh)

    if overrides.machines:
        for m in cloned.machines:
            if m.id in overrides.machines:
                mo = overrides.machines[m.id]
                if mo.idle_power_kw is not None:
                    m.idle_power_kw = float(mo.idle_power_kw)
                if mo.standby_power_kw is not None:
                    m.standby_power_kw = float(mo.standby_power_kw)
                if mo.restart_duration_min is not None:
                    m.restart_duration_min = int(mo.restart_duration_min)
                if mo.safety_buffer_min is not None:
                    m.safety_buffer_min = int(mo.safety_buffer_min)

    validate_scenario(cloned)
    return cloned



def list_scenarios() -> List[dict]:
    """List summary metadata for all registered scenarios."""
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "machines": len(s.machines),
            "jobs": len(s.jobs),
            "shift_minutes": s.shift_minutes,
            "shift_start_time": s.shift_start_time,
            "shift_end_time": s.shift_end_time,
            "electricity_tariff_per_kwh": s.electricity_tariff_per_kwh,
            "currency": s.currency,
        }
        for s in SCENARIO_REGISTRY.values()
    ]

