"""Unit tests for the machine operational state machine and legal transitions."""

import pytest
from app.models.telemetry import MachineState
from app.services.simulation.state_machine import can_transition, validate_transition


def test_legal_operational_transitions():
    """Verify that expected operational state transitions are permitted."""
    # Production cycle
    assert can_transition(MachineState.IDLE_READY, MachineState.RUNNING)
    assert can_transition(MachineState.RUNNING, MachineState.IDLE_READY)

    # Standby energy-saving cycle
    assert can_transition(MachineState.IDLE_READY, MachineState.STANDBY)
    assert can_transition(MachineState.STANDBY, MachineState.STARTING)
    assert can_transition(MachineState.STARTING, MachineState.IDLE_READY)

    # Shutdown cycle
    assert can_transition(MachineState.IDLE_READY, MachineState.OFF)
    assert can_transition(MachineState.OFF, MachineState.STARTING)

    # Self-transitions
    for state in MachineState:
        assert can_transition(state, state)


def test_illegal_state_transitions():
    """Verify that dangerous or nonsensical direct state transitions are blocked."""
    # Cannot shut off directly while machining
    assert not can_transition(MachineState.RUNNING, MachineState.OFF)
    with pytest.raises(ValueError, match="Illegal machine state transition"):
        validate_transition(MachineState.RUNNING, MachineState.OFF)

    # Cannot jump directly into production from powered-off without warmup
    assert not can_transition(MachineState.OFF, MachineState.RUNNING)
    with pytest.raises(ValueError, match="Illegal machine state transition"):
        validate_transition(MachineState.OFF, MachineState.RUNNING)

    # Cannot jump directly into production from standby without warmup
    assert not can_transition(MachineState.STANDBY, MachineState.RUNNING)
    with pytest.raises(ValueError, match="Illegal machine state transition"):
        validate_transition(MachineState.STANDBY, MachineState.RUNNING)

    # Cannot transition to standby while actively machining
    assert not can_transition(MachineState.RUNNING, MachineState.STANDBY)
    with pytest.raises(ValueError, match="Illegal machine state transition"):
        validate_transition(MachineState.RUNNING, MachineState.STANDBY)
