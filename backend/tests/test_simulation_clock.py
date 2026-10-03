"""Unit tests for the simulation clock and time formatting."""

import pytest
from app.services.simulation.clock import SimulationClock, minute_to_time_str, time_str_to_minute


def test_minute_to_time_str():
    """Verify conversion of simulation minute offsets to clock times."""
    assert minute_to_time_str(0) == "08:00"
    assert minute_to_time_str(45) == "08:45"
    assert minute_to_time_str(60) == "09:00"
    assert minute_to_time_str(480) == "16:00"


def test_time_str_to_minute():
    """Verify conversion of clock time strings to simulation minute indices."""
    assert time_str_to_minute("08:00") == 0
    assert time_str_to_minute("08:45") == 45
    assert time_str_to_minute("09:20") == 80
    assert time_str_to_minute("16:00") == 480

    with pytest.raises(ValueError, match="Invalid time format"):
        time_str_to_minute("invalid-time")

    with pytest.raises(ValueError, match="earlier than shift start"):
        time_str_to_minute("07:30")


def test_simulation_clock_progression():
    """Verify clock advancement across a 480-minute shift."""
    clock = SimulationClock(shift_minutes=480, base_hour=8, base_minute=0)

    assert clock.current_step == 0
    assert clock.current_time_str == "08:00"
    assert clock.shift_start_str == "08:00"
    assert clock.shift_end_str == "16:00"
    assert not clock.is_finished

    # Step through 480 one-minute intervals
    step_count = 0
    while not clock.is_finished:
        step_count += 1
        clock.advance()

    assert step_count == 480
    assert clock.current_step == 480
    assert clock.is_finished
    assert clock.current_time_str == "16:00"
