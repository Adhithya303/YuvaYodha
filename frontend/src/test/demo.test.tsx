import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuidedDemoModal } from '../components/demo/GuidedDemoModal';
import type { StrategyComparisonResponse } from '../types';

const mockComparison: StrategyComparisonResponse = {
  scenario_id: 'default_shift',
  strategies: {
    ALWAYS_READY: {
      simulation_run_id: 'run-ar',
      scenario_id: 'default_shift',
      strategy: 'ALWAYS_READY',
      total_energy_kwh: 208.9167,
      total_cost: 1671.33,
      jobs_completed: 12,
      late_jobs: 0,
      total_delay_minutes: 0,
      energy_per_unit: 1.393,
      total_units_produced: 150,
    } as any,
    FIXED_TIMER: {
      simulation_run_id: 'run-ft',
      scenario_id: 'default_shift',
      strategy: 'FIXED_TIMER',
      total_energy_kwh: 167.9450,
      total_cost: 1343.56,
      jobs_completed: 12,
      late_jobs: 0,
      total_delay_minutes: 0,
      energy_per_unit: 1.120,
      total_units_produced: 150,
    } as any,
    IDLEWISE: {
      simulation_run_id: 'run-iw',
      scenario_id: 'default_shift',
      strategy: 'IDLEWISE',
      total_energy_kwh: 161.6483,
      total_cost: 1293.19,
      jobs_completed: 12,
      late_jobs: 0,
      total_delay_minutes: 0,
      energy_per_unit: 1.078,
      total_units_produced: 150,
    } as any,
  },
  comparison: {
    baseline_energy_kwh: 208.9167,
    fixed_timer_energy_kwh: 167.9450,
    idlewise_energy_kwh: 161.6483,
    idlewise_vs_baseline_energy_saved_kwh: 47.2683,
    idlewise_vs_baseline_percent: 22.62,
    fixed_timer_vs_baseline_energy_saved_kwh: 40.9717,
    fixed_timer_vs_baseline_percent: 19.61,
    idlewise_vs_fixed_timer_energy_saved_kwh: 6.2967,
    idlewise_vs_fixed_timer_percent: 3.75,
    cost_saved_idlewise_vs_baseline: 378.15,
    cost_saved_idlewise_vs_fixed_timer: 50.37,
    specific_energy_reduction: 0.315,
    production_difference_units: 0,
    late_job_difference: 0,
    production_preserved: true,
  },
};

describe('GuidedDemoModal Component (Prompt 6)', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <GuidedDemoModal isOpen={false} onClose={vi.fn()} comparison={mockComparison} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Step 1 (The Problem) with baseline numbers when open', () => {
    render(<GuidedDemoModal isOpen={true} onClose={vi.fn()} comparison={mockComparison} />);

    expect(screen.getByText(/1\. The Problem: Unproductive Machine Idle Waste/i)).toBeInTheDocument();
    expect(screen.getByText(/208\.92/)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 7/i)).toBeInTheDocument();
  });

  it('navigates through steps via Next and Back controls', () => {
    render(<GuidedDemoModal isOpen={true} onClose={vi.fn()} comparison={mockComparison} />);

    // Advance to Step 2
    fireEvent.click(screen.getByText(/Next Step/i));
    expect(screen.getByText(/2\. Three Operational Strategies Evaluated/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 7/i)).toBeInTheDocument();

    // Advance to Step 3: Verified Core Result
    fireEvent.click(screen.getByText(/Next Step/i));
    expect(screen.getByText(/3\. Verified Core Result: 22\.62% Energy Reduction/i)).toBeInTheDocument();
    expect(screen.getByText(/47\.27/)).toBeInTheDocument();
    expect(screen.getByText(/₹378\.15/)).toBeInTheDocument();
    expect(screen.getByText(/150 \/ 150/)).toBeInTheDocument();

    // Advance to Step 4: Watch a Decision
    fireEvent.click(screen.getByText(/Next Step/i));
    expect(screen.getByText(/4\. Watch a Decision: CNC-01 at 10:00/i)).toBeInTheDocument();
    expect(screen.getByText(/JOB-102/)).toBeInTheDocument();

    // Test Back button
    fireEvent.click(screen.getByText(/Back/i));
    expect(screen.getByText(/3\. Verified Core Result: 22\.62% Energy Reduction/i)).toBeInTheDocument();

    // Test Restart button
    fireEvent.click(screen.getByTitle(/Restart Demo from Step 1/i));
    expect(screen.getByText(/1\. The Problem: Unproductive Machine Idle Waste/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<GuidedDemoModal isOpen={true} onClose={handleClose} comparison={mockComparison} />);

    fireEvent.click(screen.getByLabelText(/Close guided demo/i));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
