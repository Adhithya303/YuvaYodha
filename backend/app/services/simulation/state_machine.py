"""Machine operational state machine and legal transition rules."""

from typing import Set, Tuple
from app.models.telemetry import MachineState

# Explicit legal transitions (from_state, to_state)
# Self-transitions (state -> state) are implicitly allowed
LEGAL_TRANSITIONS: Set[Tuple[MachineState, MachineState]] = {
    # Active production cycle
    (MachineState.IDLE_READY, MachineState.RUNNING),
    (MachineState.RUNNING, MachineState.IDLE_READY),

    # Standby energy-saving cycle (Prompt 3+)
    (MachineState.IDLE_READY, MachineState.STANDBY),
    (MachineState.STANDBY, MachineState.STARTING),
    (MachineState.STARTING, MachineState.IDLE_READY),

    # Shutdown cycle (Prompt 3+)
    (MachineState.IDLE_READY, MachineState.OFF),
    (MachineState.OFF, MachineState.STARTING),
}


def can_transition(from_state: MachineState, to_state: MachineState) -> bool:
    """Check whether a transition between two operational states is permitted."""
    if from_state == to_state:
        return True
    return (from_state, to_state) in LEGAL_TRANSITIONS


def validate_transition(from_state: MachineState, to_state: MachineState) -> None:
    """Validate that state transition is legal, raising ValueError if illegal.

    Raises:
        ValueError: Explaining why the transition is prohibited by equipment safety rules.
    """
    if not can_transition(from_state, to_state):
        raise ValueError(
            f"Illegal machine state transition: '{from_state.value}' -> '{to_state.value}'. "
            f"Machines cannot transition directly without passing through proper warmup or ready states."
        )
