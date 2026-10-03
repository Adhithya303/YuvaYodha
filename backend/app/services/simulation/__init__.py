"""Simulation engine package."""

from app.services.simulation.clock import SimulationClock, minute_to_time_str, time_str_to_minute
from app.services.simulation.state_machine import can_transition, validate_transition
from app.services.simulation.energy import (
    calculate_step_energy_kwh,
    calculate_total_cost,
    calculate_energy_per_unit,
    get_machine_power_kw,
)
from app.services.simulation.scenario import (
    ScenarioDefinition,
    ScenarioMachine,
    ScenarioJob,
    validate_scenario,
    get_scenario,
    list_scenarios,
    DEFAULT_SHIFT_SCENARIO,
)
from app.services.simulation.engine import (
    SimulationEngine,
    SimulationResult,
    MachineResultSummary,
    JobResultSummary,
)

__all__ = [
    "SimulationClock",
    "minute_to_time_str",
    "time_str_to_minute",
    "can_transition",
    "validate_transition",
    "calculate_step_energy_kwh",
    "calculate_total_cost",
    "calculate_energy_per_unit",
    "get_machine_power_kw",
    "ScenarioDefinition",
    "ScenarioMachine",
    "ScenarioJob",
    "validate_scenario",
    "get_scenario",
    "list_scenarios",
    "DEFAULT_SHIFT_SCENARIO",
    "SimulationEngine",
    "SimulationResult",
    "MachineResultSummary",
    "JobResultSummary",
]
