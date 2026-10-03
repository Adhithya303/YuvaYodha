"""Simulation strategy implementations package."""

from typing import Optional
from app.models.simulation_run import StrategyType
from app.services.simulation.decision import StrategyConfig
from app.services.simulation.strategies.base import SimulationStrategy
from app.services.simulation.strategies.always_ready import AlwaysReadyStrategy
from app.services.simulation.strategies.fixed_timer import FixedTimerStrategy
from app.services.simulation.strategies.idlewise import IdleWiseStrategy


def get_strategy(
    strategy_type: StrategyType,
    config: Optional[StrategyConfig] = None,
) -> SimulationStrategy:
    """Factory retrieving instantiated strategy runner."""
    if strategy_type == StrategyType.ALWAYS_READY:
        return AlwaysReadyStrategy(config=config)
    elif strategy_type == StrategyType.FIXED_TIMER:
        return FixedTimerStrategy(config=config)
    elif strategy_type == StrategyType.IDLEWISE:
        return IdleWiseStrategy(config=config)
    else:
        raise ValueError(f"Unknown strategy type: {strategy_type}")


__all__ = [
    "SimulationStrategy",
    "AlwaysReadyStrategy",
    "FixedTimerStrategy",
    "IdleWiseStrategy",
    "get_strategy",
]

