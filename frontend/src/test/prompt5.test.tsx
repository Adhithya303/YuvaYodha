import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  compressMachineTelemetry,
  minuteToShiftTime,
  minuteToTimelinePercent,
} from '../utils/timelineUtils';
import { CandidateEnergyTable } from '../components/decisions/CandidateEnergyTable';
import { DecisionDetailDrawer } from '../components/decisions/DecisionDetailDrawer';
import { DecisionExplorer } from '../components/decisions/DecisionExplorer';
import { WhatIfComparison } from '../components/whatif/WhatIfComparison';
import { StrategyComparisonTable } from '../components/dashboard/StrategyComparisonTable';
import type { Decision, SimulationResult, StrategyComparisonResponse } from '../types';

describe('Prompt 5: Timeline Utilities & Compression', () => {
  it('converts simulation minutes to shift timestamps and percentages', () => {
    expect(minuteToShiftTime(0)).toBe('08:00');
    expect(minuteToShiftTime(120)).toBe('10:00');
    expect(minuteToShiftTime(180)).toBe('11:00');
    expect(minuteToShiftTime(480)).toBe('16:00');

    expect(minuteToTimelinePercent(0)).toBe(0);
    expect(minuteToTimelinePercent(240)).toBe(50);
    expect(minuteToTimelinePercent(480)).toBe(100);
  });

  it('compresses consecutive identical telemetry states into continuous operational blocks', () => {
    const rawTelemetry = [
      // 10 minutes RUNNING
      ...Array.from({ length: 10 }, (_, i) => ({
        minute: i,
        state: 'RUNNING' as const,
        power_kw: 12.0,
      })),
      // 5 minutes RUNNING
      ...Array.from({ length: 5 }, (_, i) => ({
        minute: 10 + i,
        state: 'RUNNING' as const,
        power_kw: 12.0,
      })),
      // 30 minutes OFF
      ...Array.from({ length: 30 }, (_, i) => ({
        minute: 15 + i,
        state: 'OFF' as const,
        power_kw: 0.1,
      })),
      // 10 minutes OFF
      ...Array.from({ length: 10 }, (_, i) => ({
        minute: 45 + i,
        state: 'OFF' as const,
        power_kw: 0.1,
      })),
      // 5 minutes STARTING
      ...Array.from({ length: 5 }, (_, i) => ({
        minute: 55 + i,
        state: 'STARTING' as const,
        power_kw: 5.0,
      })),
    ];

    const compressed = compressMachineTelemetry(rawTelemetry, 'CNC-01');

    // Should compress 60 items into exactly 3 blocks: RUNNING (15m), OFF (40m), STARTING (5m)
    expect(compressed.length).toBe(3);

    expect(compressed[0].state).toBe('RUNNING');
    expect(compressed[0].startMinute).toBe(0);
    expect(compressed[0].endMinute).toBe(15);
    expect(compressed[0].durationMin).toBe(15);
    expect(compressed[0].startTimeStr).toBe('08:00');
    expect(compressed[0].endTimeStr).toBe('08:15');

    expect(compressed[1].state).toBe('OFF');
    expect(compressed[1].startMinute).toBe(15);
    expect(compressed[1].endMinute).toBe(55);
    expect(compressed[1].durationMin).toBe(40);
    expect(compressed[1].avgPowerKw).toBe(0.1);

    expect(compressed[2].state).toBe('STARTING');
    expect(compressed[2].startMinute).toBe(55);
    expect(compressed[2].endMinute).toBe(60);
    expect(compressed[2].durationMin).toBe(5);
  });
});

describe('Prompt 5: Decision Explorer & Drawer', () => {
  const sampleDecision: Decision = {
    id: 1,
    timestamp: 120, // 10:00
    machine_id: 'CNC-01',
    current_state: 'IDLE_READY',
    recommended_action: 'SHUTDOWN',
    idle_window_min: 60,
    keep_ready_energy_kwh: 6.0,
    standby_energy_kwh: 1.7333,
    shutdown_energy_kwh: 0.9833,
    estimated_energy_saved_kwh: 5.0167,
    estimated_cost_saved: 40.13,
    restart_start_minute: 170, // 10:50
    ready_minute: 175, // 10:55
    production_risk: 'LOW',
    reason:
      'Shutdown uses the least energy in this idle window while still allowing the machine to restart and be ready 5 minutes before the next job.',
  };

  it('renders candidate operating state comparison in CandidateEnergyTable', () => {
    render(<CandidateEnergyTable decision={sampleDecision} />);

    expect(screen.getByText('Candidate Operating State Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Keep Ready')).toBeInTheDocument();
    expect(screen.getByText('Standby')).toBeInTheDocument();
    expect(screen.getByText('Shutdown')).toBeInTheDocument();

    // Check energies
    expect(screen.getByText(/6.0000 kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/1.7333 kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/0.9833 kWh/i)).toBeInTheDocument();

    // Selected badge on Shutdown
    expect(screen.getByText('SELECTED')).toBeInTheDocument();
  });

  it('renders DecisionDetailDrawer with rationale, safety buffer, and calculations', () => {
    const handleClose = vi.fn();
    const handleSeek = vi.fn();

    render(
      <DecisionDetailDrawer
        decision={sampleDecision}
        isOpen={true}
        onClose={handleClose}
        onSeekMinute={handleSeek}
      />
    );

    expect(screen.getByText('CNC-01')).toBeInTheDocument();
    expect(screen.getByText('Operational Rationale')).toBeInTheDocument();
    expect(screen.getByText(sampleDecision.reason)).toBeInTheDocument();
    expect(screen.getByText(/Preserved \(0 Job Delays\)/i)).toBeInTheDocument();

    // Expand equations
    const mathToggle = screen.getByText('View Mathematical Formulations');
    fireEvent.click(mathToggle);
    expect(screen.getByText(/E_keep = P_idle/i)).toBeInTheDocument();

    // Click seek
    const seekBtn = screen.getByRole('button', { name: /seek playback to 10:00/i });
    fireEvent.click(seekBtn);
    expect(handleSeek).toHaveBeenCalledWith(120);
  });

  it('filters decisions and calculates highest-saving decision in DecisionExplorer', () => {
    const decisions: Decision[] = [
      sampleDecision,
      {
        id: 2,
        timestamp: 180,
        machine_id: 'CNC-02',
        current_state: 'IDLE_READY',
        recommended_action: 'STANDBY',
        idle_window_min: 30,
        estimated_energy_saved_kwh: 1.5,
        estimated_cost_saved: 12.0,
        production_risk: 'LOW',
        reason: 'Standby saves energy.',
      },
    ];

    render(<DecisionExplorer decisions={decisions} />);

    // Total stats
    expect(screen.getByText('2')).toBeInTheDocument(); // total decisions
    expect(screen.getByText(/1 Standby/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Shutdown/i)).toBeInTheDocument();

    // Highest saving card
    expect(screen.getByText('Highest Energy-Saving Decision')).toBeInTheDocument();
    expect(screen.getByText(/5.02 kWh/i)).toBeInTheDocument();

    // Filter by machine CNC-02
    const machineSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(machineSelect, { target: { value: 'CNC-02' } });

    // CNC-01 item should no longer be visible in the list
    expect(screen.queryByText(sampleDecision.reason)).not.toBeInTheDocument();
    expect(screen.getByText('Standby saves energy.')).toBeInTheDocument();
  });
});

describe('Prompt 5: What-If Sandbox & Comparison Tables', () => {
  const baseResult: SimulationResult = {
    simulation_run_id: 'base-run',
    scenario_id: 'default_shift',
    scenario_name: 'Default Shift',
    strategy: 'IDLEWISE',
    status: 'COMPLETED',
    shift_start_time: '08:00',
    shift_end_time: '16:00',
    shift_minutes: 480,
    total_energy_kwh: 161.65,
    total_cost: 1293.2,
    electricity_tariff_per_kwh: 8.0,
    currency: 'INR',
    total_units_produced: 150,
    energy_per_unit: 1.078,
    jobs_completed: 12,
    late_jobs: 0,
    total_delay_minutes: 0,
    factory_utilization_percent: 65,
    machine_results: [],
    job_results: [],
    number_of_standby_events: 5,
    number_of_shutdown_events: 4,
    number_of_restart_events: 9,
  };

  const whatIfSafeResult: SimulationResult = {
    ...baseResult,
    simulation_run_id: 'whatif-safe-run',
    total_energy_kwh: 158.2,
    total_cost: 1265.6,
  };

  const whatIfUnsafeResult: SimulationResult = {
    ...baseResult,
    simulation_run_id: 'whatif-unsafe-run',
    total_energy_kwh: 140.0,
    total_cost: 1120.0,
    late_jobs: 2, // Violated production!
  };

  it('displays preserved production banner when What-If maintains 100% throughput', () => {
    render(<WhatIfComparison original={baseResult} whatIf={whatIfSafeResult} />);
    expect(screen.getByText(/Production 100% Preserved/i)).toBeInTheDocument();
    expect(screen.getByText('-3.45 kWh (-2.1%)')).toBeInTheDocument();
  });

  it('displays production violation warning when What-If creates late jobs', () => {
    render(<WhatIfComparison original={baseResult} whatIf={whatIfUnsafeResult} />);
    expect(screen.getByText(/Production Violation Warning/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Never celebrate energy savings that violate production delivery constraints/i)
    ).toBeInTheDocument();
  });

  it('renders StrategyComparisonTable across all 12 operational dimensions', () => {
    const comparison: StrategyComparisonResponse = {
      scenario_id: 'default_shift',
      strategies: {
        ALWAYS_READY: { ...baseResult, total_energy_kwh: 208.92, total_cost: 1671.33 },
        FIXED_TIMER: { ...baseResult, total_energy_kwh: 167.95, total_cost: 1343.56 },
        IDLEWISE: baseResult,
      },
      comparison: {
        baseline_energy_kwh: 208.92,
        fixed_timer_energy_kwh: 167.95,
        idlewise_energy_kwh: 161.65,
        idlewise_vs_baseline_energy_saved_kwh: 47.27,
        idlewise_vs_baseline_percent: 22.62,
        fixed_timer_vs_baseline_energy_saved_kwh: 40.97,
        fixed_timer_vs_baseline_percent: 19.61,
        idlewise_vs_fixed_timer_energy_saved_kwh: 6.3,
        idlewise_vs_fixed_timer_percent: 3.75,
        cost_saved_idlewise_vs_baseline: 378.15,
        cost_saved_idlewise_vs_fixed_timer: 50.36,
        specific_energy_reduction: 0.315,
        production_difference_units: 0,
        late_job_difference: 0,
        production_preserved: true,
      },
    };

    render(<StrategyComparisonTable comparison={comparison} />);
    expect(screen.getByText('Multi-Strategy Industrial Comparison')).toBeInTheDocument();
    expect(screen.getByText(/100% Production Preserved Across All Strategies/i)).toBeInTheDocument();
    expect(screen.getByText(/208.92 kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/167.95 kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/161.65 kWh/i)).toBeInTheDocument();
  });
});
