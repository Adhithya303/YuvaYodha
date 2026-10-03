"""Base strategy abstraction for simulation operational policies."""

from abc import ABC, abstractmethod
from typing import List, Optional, Any
from app.models.telemetry import MachineState
from app.models.simulation_run import StrategyType
from app.services.simulation.decision import IdleWindow, IdleDecision, StrategyConfig


class SimulationStrategy(ABC):
    """Abstract base class for machine idle-state decision policies."""

    def __init__(self, config: Optional[StrategyConfig] = None):
        self.config = config or StrategyConfig()

    @property
    @abstractmethod
    def strategy_type(self) -> StrategyType:
        """The strategy enum identifier."""
        pass

    @abstractmethod
    def evaluate_idle_window(
        self,
        machine: Any,
        window: IdleWindow,
        tariff_per_kwh: float = 8.0,
    ) -> IdleDecision:
        """Evaluate an inter-job idle window and produce an explainable decision.

        Args:
            machine: Static machine definition (ScenarioMachine)
            window: Inter-job idle window metadata
            tariff_per_kwh: Active electricity rate for cost saving calculation

        Returns:
            IdleDecision: Decision object containing action, energy estimates, and reason.
        """
        pass

    @abstractmethod
    def decide_machine_state(
        self,
        machine: Any,
        runtime_state: Any,
        current_step: int,
        upcoming_jobs: List[Any],
    ) -> MachineState:
        """Evaluate operational conditions and return recommended machine state for next step.

        Args:
            machine: Static machine configuration (ScenarioMachine)
            runtime_state: Mutable simulation runtime state (MachineRuntimeState)
            current_step: Current simulation minute index [0, shift_minutes)
            upcoming_jobs: Jobs queued for this machine in the remainder of the shift

        Returns:
            MachineState: The target operational state (RUNNING, IDLE_READY, STANDBY, etc.)
        """
        pass
