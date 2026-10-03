"""Energy and electrical power calculation module.

All simulation calculations use double-precision floating-point arithmetic.
Units:
- Power: kW (Kilowatts)
- Duration: minutes
- Energy: kWh (Kilowatt-hours)
  Formula: energy_kwh = power_kw * (duration_minutes / 60.0)
"""

from typing import Any
from app.models.telemetry import MachineState


def calculate_step_energy_kwh(power_kw: float, duration_minutes: float = 1.0) -> float:
    """Calculate energy consumed in kilowatt-hours for a time duration in minutes.

    Example:
        calculate_step_energy_kwh(60.0, 1.0) -> 1.0 kWh
        calculate_step_energy_kwh(12.0, 5.0) -> 1.0 kWh
        calculate_step_energy_kwh(12.0, 1.0) -> 0.2 kWh
    """
    return float(power_kw) * (float(duration_minutes) / 60.0)


def calculate_total_cost(total_energy_kwh: float, tariff_per_kwh: float) -> float:
    """Calculate electricity cost from energy and flat tariff rate.

    Example:
        calculate_total_cost(100.0, 8.0) -> 800.0
    """
    return float(total_energy_kwh) * float(tariff_per_kwh)


def calculate_energy_per_unit(total_energy_kwh: float, total_units: int) -> float:
    """Calculate energy consumed per finished unit of production.

    Safely returns 0.0 if zero units were produced.
    """
    if total_units <= 0:
        return 0.0
    return float(total_energy_kwh) / float(total_units)


def get_machine_power_kw(machine: Any, state: MachineState) -> float:
    """Determine instantaneous electrical power (kW) for a machine in a given state.

    STARTING power is modeled as the uniform average power over the restart duration:
    P_starting = restart_energy_kwh / (restart_duration_min / 60)
    """
    if state == MachineState.RUNNING:
        return float(machine.run_power_kw)
    elif state == MachineState.IDLE_READY:
        return float(machine.idle_power_kw)
    elif state == MachineState.STANDBY:
        return float(machine.standby_power_kw)
    elif state == MachineState.OFF:
        return float(machine.off_power_kw)
    elif state == MachineState.STARTING:
        # Prompt 2 placeholder / standard warmup distribution
        if machine.restart_duration_min > 0:
            return float(machine.restart_energy_kwh) / (float(machine.restart_duration_min) / 60.0)
        return float(machine.idle_power_kw)
    else:
        return float(machine.idle_power_kw)
