"""Simulation clock module.

Provides discrete 1-minute time-step management for factory shifts.
Default shift: 08:00 to 16:00 (480 simulation minutes).
Steps represent 1-minute discrete intervals [T, T+1) where T in [0, 480).
"""

from dataclasses import dataclass
from typing import Tuple


def minute_to_time_str(minute: int, base_hour: int = 8, base_minute: int = 0) -> str:
    """Convert simulation minute index to clock time string HH:MM.

    Example:
        minute_to_time_str(0) -> "08:00"
        minute_to_time_str(45) -> "08:45"
        minute_to_time_str(480) -> "16:00"
    """
    total_minutes = base_hour * 60 + base_minute + minute
    hours = (total_minutes // 60) % 24
    mins = total_minutes % 60
    return f"{hours:02d}:{mins:02d}"


def time_str_to_minute(time_str: str, base_hour: int = 8, base_minute: int = 0) -> int:
    """Convert HH:MM clock string into simulation minute index from shift start.

    Example:
        time_str_to_minute("08:00") -> 0
        time_str_to_minute("08:45") -> 45
        time_str_to_minute("16:00") -> 480
    """
    parts = time_str.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time format '{time_str}', expected HH:MM")
    hours, mins = int(parts[0]), int(parts[1])
    target_total = hours * 60 + mins
    base_total = base_hour * 60 + base_minute
    diff = target_total - base_total
    if diff < 0:
        raise ValueError(f"Time '{time_str}' is earlier than shift start {base_hour:02d}:{base_minute:02d}")
    return diff


@dataclass
class SimulationClock:
    """Discrete time-step clock tracking simulation progression."""

    shift_minutes: int = 480
    base_hour: int = 8
    base_minute: int = 0
    current_step: int = 0

    @property
    def is_finished(self) -> bool:
        """Returns True if the clock has reached or exceeded shift end."""
        return self.current_step >= self.shift_minutes

    @property
    def current_time_str(self) -> str:
        """Formatted HH:MM representation of current simulation step."""
        return minute_to_time_str(self.current_step, self.base_hour, self.base_minute)

    @property
    def shift_start_str(self) -> str:
        """Formatted start time of shift."""
        return minute_to_time_str(0, self.base_hour, self.base_minute)

    @property
    def shift_end_str(self) -> str:
        """Formatted end time of shift."""
        return minute_to_time_str(self.shift_minutes, self.base_hour, self.base_minute)

    def advance(self) -> int:
        """Advance clock by one simulation minute and return new step."""
        if not self.is_finished:
            self.current_step += 1
        return self.current_step

    def reset(self) -> None:
        """Reset clock to start of shift."""
        self.current_step = 0
