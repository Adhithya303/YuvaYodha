"""Unit tests for electrical power and energy accumulation mathematics."""

import pytest
from app.services.simulation.energy import (
    calculate_step_energy_kwh,
    calculate_total_cost,
    calculate_energy_per_unit,
    get_machine_power_kw,
)
from app.models.telemetry import MachineState
from app.services.simulation.scenario import ScenarioMachine


def test_calculate_step_energy_exactness():
    """Confirm mathematical exactness of energy formulas."""
    # 60 kW for 1 minute = 1.0 kWh
    assert calculate_step_energy_kwh(60.0, 1.0) == pytest.approx(1.0, rel=1e-6)

    # 12 kW for 5 minutes = 1.0 kWh
    assert calculate_step_energy_kwh(12.0, 5.0) == pytest.approx(1.0, rel=1e-6)

    # 12 kW for 1 minute = 0.2 kWh
    assert calculate_step_energy_kwh(12.0, 1.0) == pytest.approx(0.2, rel=1e-6)

    # 0 kW for 10 minutes = 0 kWh
    assert calculate_step_energy_kwh(0.0, 10.0) == 0.0


def test_calculate_total_cost():
    """Verify flat tariff electricity cost calculation."""
    # 100 kWh at 8.0 INR/kWh = 800.0 INR
    assert calculate_total_cost(100.0, 8.0) == pytest.approx(800.0, rel=1e-6)


def test_calculate_energy_per_unit():
    """Verify energy per produced unit with division-by-zero safeguard."""
    # 150 kWh for 300 units = 0.5 kWh/unit
    assert calculate_energy_per_unit(150.0, 300) == pytest.approx(0.5, rel=1e-6)

    # 0 units produced should return 0.0 without ZeroDivisionError
    assert calculate_energy_per_unit(100.0, 0) == 0.0


def test_get_machine_power_lookup():
    """Verify power lookup from machine specification based on operational state."""
    machine = ScenarioMachine(
        id="CNC-M1",
        name="Test Machine",
        run_power_kw=20.0,
        idle_power_kw=7.0,
        standby_power_kw=1.5,
        off_power_kw=0.2,
        restart_duration_min=6,
        restart_energy_kwh=0.6,
    )

    assert get_machine_power_kw(machine, MachineState.RUNNING) == 20.0
    assert get_machine_power_kw(machine, MachineState.IDLE_READY) == 7.0
    assert get_machine_power_kw(machine, MachineState.STANDBY) == 1.5
    assert get_machine_power_kw(machine, MachineState.OFF) == 0.2
    # STARTING warmup power = 0.6 kWh / (6/60 h) = 6.0 kW
    assert get_machine_power_kw(machine, MachineState.STARTING) == pytest.approx(6.0, rel=1e-6)
