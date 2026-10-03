import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useSimulationPlayback } from '../hooks/useSimulationPlayback';
import { FactoryLivePanel } from '../components/simulation/FactoryLivePanel';
import type { PlaybackResponse } from '../types';

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as any;

const mockPlaybackData: PlaybackResponse = {
  run_id: 'test-run-12345',
  scenario_id: 'default_shift',
  strategy: 'IDLEWISE',
  shift_start: '08:00',
  shift_end: '16:00',
  total_frames: 10, // 10 test frames
  machines: [
    {
      id: 'CNC-01',
      name: 'CNC Milling Center 1',
      machine_type: '3-Axis CNC',
      run_power_kw: 12.0,
      idle_power_kw: 6.0,
      standby_power_kw: 1.0,
      off_power_kw: 0.1,
      restart_duration_min: 5,
      safety_buffer_min: 5,
    },
    {
      id: 'CNC-02',
      name: 'CNC Milling Center 2',
      machine_type: '5-Axis CNC',
      run_power_kw: 16.0,
      idle_power_kw: 8.0,
      standby_power_kw: 1.2,
      off_power_kw: 0.15,
      restart_duration_min: 8,
      safety_buffer_min: 5,
    },
    {
      id: 'CNC-03',
      name: 'CNC Turning Lathe',
      machine_type: 'Turning Center',
      run_power_kw: 10.0,
      idle_power_kw: 4.5,
      standby_power_kw: 0.8,
      off_power_kw: 0.05,
      restart_duration_min: 4,
      safety_buffer_min: 5,
    },
  ],
  frames: Array.from({ length: 10 }, (_, i) => ({
    minute_index: i,
    simulation_time: `08:0${i}`,
    progress_percent: (i + 1) * 10,
    machines: [
      {
        machine_id: 'CNC-01',
        state: i < 3 ? 'RUNNING' : i < 6 ? 'OFF' : i < 8 ? 'STARTING' : 'RUNNING',
        power_kw: i < 3 ? 12.0 : i < 6 ? 0.1 : i < 8 ? 4.8 : 12.0,
        active_job_id: i < 3 || i >= 8 ? 'JOB-101' : null,
        next_job_id: i >= 3 && i < 8 ? 'JOB-102' : null,
        next_job_start: '08:08',
        context_note: i < 3 ? 'Processing JOB-101' : i < 6 ? 'IdleWise shutdown active' : 'Warmup & restart in progress',
      },
      {
        machine_id: 'CNC-02',
        state: 'RUNNING',
        power_kw: 16.0,
        active_job_id: 'JOB-201',
      },
      {
        machine_id: 'CNC-03',
        state: 'IDLE_READY',
        power_kw: 4.5,
      },
    ],
    decisions:
      i === 3
        ? [
            {
              timestamp: 3,
              time_str: '08:03',
              machine_id: 'CNC-01',
              recommended_action: 'SHUTDOWN',
              idle_window_min: 5,
              estimated_energy_saved_kwh: 0.45,
              estimated_cost_saved: 3.6,
              production_risk: 'LOW',
              reason: 'Shutdown offers lowest-energy safe operation.',
            },
          ]
        : [],
    cumulative: {
      energy_kwh: Number((i * 0.5).toFixed(4)),
      cost: Number((i * 4.0).toFixed(2)),
      jobs_completed: i >= 3 ? 1 : 0,
      units_produced: i >= 3 ? 20 : 0,
      factory_power_kw: Number((i < 3 ? 32.5 : 20.6).toFixed(2)),
    },
  })),
  final_summary: {
    total_energy_kwh: 4.5,
    total_cost: 36.0,
    jobs_completed: 1,
    late_jobs: 0,
    total_units_produced: 20,
    production_preserved: true,
  },
};

describe('useSimulationPlayback hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes at frame 0 and paused', () => {
    const { result } = renderHook(() => useSimulationPlayback(mockPlaybackData));

    expect(result.current.currentFrameIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentFrame?.simulation_time).toBe('08:00');
    expect(result.current.isComplete).toBe(false);
  });

  it('advances frames when playing and pauses when requested', () => {
    const { result } = renderHook(() => useSimulationPlayback(mockPlaybackData));

    act(() => {
      result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);

    // Fast-forward 100ms (speed 60x interval)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.currentFrameIndex).toBe(1);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.currentFrameIndex).toBe(3);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPlaying).toBe(false);

    // After pausing, time does not advance frame
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.currentFrameIndex).toBe(3);
  });

  it('auto-pauses on seek / scrub and jumps to specified minute', () => {
    const { result } = renderHook(() => useSimulationPlayback(mockPlaybackData));

    act(() => {
      result.current.play();
      result.current.seekToMinute(7);
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentFrameIndex).toBe(7);
    expect(result.current.currentFrame?.simulation_time).toBe('08:07');
  });

  it('supports single-minute step forward and backward', () => {
    const { result } = renderHook(() => useSimulationPlayback(mockPlaybackData));

    act(() => {
      result.current.stepForward();
    });
    expect(result.current.currentFrameIndex).toBe(1);

    act(() => {
      result.current.stepForward();
    });
    expect(result.current.currentFrameIndex).toBe(2);

    act(() => {
      result.current.stepBackward();
    });
    expect(result.current.currentFrameIndex).toBe(1);
  });

  it('restarts to frame 0', () => {
    const { result } = renderHook(() => useSimulationPlayback(mockPlaybackData));

    act(() => {
      result.current.seekToMinute(8);
      result.current.restart();
    });

    expect(result.current.currentFrameIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it('stops at final frame and marks isComplete true', () => {
    const { result } = renderHook(() => useSimulationPlayback(mockPlaybackData));

    act(() => {
      result.current.play();
    });

    // Advance through all 10 frames
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.currentFrameIndex).toBe(9);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isComplete).toBe(true);
  });

  it('reveals decisions at their exact frame timestamp', () => {
    const { result } = renderHook(() => useSimulationPlayback(mockPlaybackData));

    // At frame 0: no decisions
    expect(result.current.recentDecisions.length).toBe(0);

    // Seek to frame 2 (before decision at 3)
    act(() => {
      result.current.seekToMinute(2);
    });
    expect(result.current.recentDecisions.length).toBe(0);

    // Seek to frame 3 (decision occurs at frame 3)
    act(() => {
      result.current.seekToMinute(3);
    });
    expect(result.current.recentDecisions.length).toBe(1);
    expect(result.current.recentDecisions[0].recommended_action).toBe('SHUTDOWN');
    expect(result.current.recentDecisions[0].machine_id).toBe('CNC-01');
  });

  it('updates machine states accurately across frames', () => {
    const { result } = renderHook(() => useSimulationPlayback(mockPlaybackData));

    // Frame 0: CNC-01 is RUNNING
    expect(result.current.currentFrame?.machines[0].state).toBe('RUNNING');
    expect(result.current.currentFrame?.machines[0].power_kw).toBe(12.0);

    // Frame 4: CNC-01 is OFF
    act(() => {
      result.current.seekToMinute(4);
    });
    expect(result.current.currentFrame?.machines[0].state).toBe('OFF');
    expect(result.current.currentFrame?.machines[0].power_kw).toBe(0.1);

    // Frame 6: CNC-01 is STARTING
    act(() => {
      result.current.seekToMinute(6);
    });
    expect(result.current.currentFrame?.machines[0].state).toBe('STARTING');
    expect(result.current.currentFrame?.machines[0].power_kw).toBe(4.8);
  });
});

describe('FactoryLivePanel UI component', () => {
  it('renders playback controls, machine cards, and power telemetry', () => {
    const handleExit = vi.fn();
    render(<FactoryLivePanel playbackData={mockPlaybackData} onExitPlayback={handleExit} />);

    // Header & Badge
    expect(screen.getByText('Virtual Factory Shift Replay')).toBeInTheDocument();
    expect(screen.getByText(/Strategy C: IdleWise Engine/i)).toBeInTheDocument();

    // Machine names (present in live cards and timeline tracks)
    expect(screen.getAllByText('CNC Milling Center 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CNC Milling Center 2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CNC Turning Lathe').length).toBeGreaterThanOrEqual(1);

    // Transport buttons
    expect(screen.getByRole('button', { name: /play replay/i })).toBeInTheDocument();

    // Exit button
    const exitBtn = screen.getByRole('button', { name: /summary view/i });
    fireEvent.click(exitBtn);
    expect(handleExit).toHaveBeenCalledTimes(1);
  });
});
