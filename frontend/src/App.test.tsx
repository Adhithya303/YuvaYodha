import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';

// Mock the API service
vi.mock('./services/api', () => ({
  api: {
    getHealth: vi.fn().mockResolvedValue({
      status: 'ok',
      service: 'IdleWise API',
      database: 'connected',
      version: '0.1.0',
    }),
    getMachines: vi.fn().mockResolvedValue([
      {
        id: 'CNC-01',
        name: 'CNC Milling Center 1',
        machine_type: 'CNC 3-Axis',
        run_power_kw: 12.0,
        idle_power_kw: 6.0,
        standby_power_kw: 1.0,
        off_power_kw: 0.1,
        restart_duration_min: 5,
        restart_energy_kwh: 0.4,
        standby_allowed: true,
        shutdown_allowed: true,
        minimum_off_time_min: 30,
        safety_buffer_min: 5,
      },
    ]),
    getMachineById: vi.fn(),
    getJobs: vi.fn().mockResolvedValue([]),
    getJobById: vi.fn(),
    getScenarios: vi.fn().mockResolvedValue([
      {
        id: 'default_shift',
        name: 'Default CNC Workshop Shift',
        description: 'Standard 8-hour shift',
        machines: 3,
        jobs: 12,
        shift_minutes: 480,
        shift_start_time: '08:00',
        shift_end_time: '16:00',
        electricity_tariff_per_kwh: 8.0,
        currency: 'INR',
      },
    ]),
    runSimulation: vi.fn(),
    compareSimulations: vi.fn().mockResolvedValue({
      scenario_id: 'default_shift',
      strategies: {
        ALWAYS_READY: {
          total_energy_kwh: 208.9167,
          total_cost: 1671.33,
          total_units_produced: 150,
          jobs_completed: 12,
          late_jobs: 0,
        },
        FIXED_TIMER: {
          total_energy_kwh: 167.945,
          total_cost: 1343.56,
          total_units_produced: 150,
          jobs_completed: 12,
          late_jobs: 0,
        },
        IDLEWISE: {
          total_energy_kwh: 161.6483,
          total_cost: 1293.19,
          total_units_produced: 150,
          jobs_completed: 12,
          late_jobs: 0,
        },
      },
      comparison: {
        baseline_energy_kwh: 208.9167,
        fixed_timer_energy_kwh: 167.945,
        idlewise_energy_kwh: 161.6483,
        idlewise_vs_baseline_energy_saved_kwh: 47.2683,
        idlewise_vs_baseline_percent: 22.62,
        fixed_timer_vs_baseline_energy_saved_kwh: 40.9717,
        fixed_timer_vs_baseline_percent: 19.61,
        idlewise_vs_fixed_timer_energy_saved_kwh: 6.2967,
        idlewise_vs_fixed_timer_percent: 3.75,
        cost_saved_idlewise_vs_baseline: 378.15,
        cost_saved_idlewise_vs_fixed_timer: 50.37,
        specific_energy_reduction: 0.3151,
        production_difference_units: 0,
        late_job_difference: 0,
        production_preserved: true,
      },
    }),
    getSimulations: vi.fn().mockResolvedValue([]),
    getSimulationById: vi.fn(),
    getSimulationTelemetry: vi.fn().mockResolvedValue([]),
    getSimulationDecisions: vi.fn().mockResolvedValue([]),
  },
}));

describe('IdleWise App Foundation & Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the application shell and overview title', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('IDLEWISE')).toBeInTheDocument();
    expect(screen.getAllByText(/Energy-Aware Machine Idle-State Optimization/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Simulated Factory Prototype/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays navigation tabs: Overview, Machines, Simulation, Insights', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /machines/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simulation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /insights/i })).toBeInTheDocument();
  });

  it('navigates to Simulation tab and displays strategy controls and compare button', async () => {
    await act(async () => {
      render(<App />);
    });

    const simTab = screen.getByRole('button', { name: /simulation/i });
    await act(async () => {
      fireEvent.click(simTab);
    });

    // Check header
    expect(screen.getByText('Factory Shift Simulation & Optimization')).toBeInTheDocument();

    // Check Compare All button exists
    expect(screen.getByRole('button', { name: /compare all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run strategy/i })).toBeInTheDocument();

    // Check strategy options include Always Ready, Fixed Timer, and IdleWise
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/strategy c: idlewise engine/i)).toBeInTheDocument();
    expect(screen.getByText(/strategy b: fixed timer/i)).toBeInTheDocument();
    expect(screen.getByText(/strategy a: always ready/i)).toBeInTheDocument();
  });
});
