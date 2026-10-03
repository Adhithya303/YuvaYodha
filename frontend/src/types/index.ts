/**
 * TypeScript domain models for IdleWise.
 */

export interface Machine {
  id: string;
  name: string;
  machine_type: string;
  run_power_kw: number;
  idle_power_kw: number;
  standby_power_kw: number;
  off_power_kw: number;
  restart_duration_min: number;
  restart_energy_kwh: number;
  standby_allowed: boolean;
  shutdown_allowed: boolean;
  minimum_off_time_min: number;
  safety_buffer_min: number;
  created_at?: string;
  updated_at?: string;
}

export type JobStatus = 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'DELAYED';

export interface Job {
  id: string;
  job_name: string;
  product_type: string;
  machine_id: string;
  scheduled_start: number;
  duration_min: number;
  deadline: number;
  status: JobStatus;
  quantity: number;
  created_at?: string;
}

export type MachineState = 'RUNNING' | 'IDLE_READY' | 'STANDBY' | 'STARTING' | 'OFF';

export interface Telemetry {
  id?: number;
  timestamp: number;
  machine_id: string;
  machine_state: MachineState;
  power_kw: number;
  active_job_id?: string | null;
  simulation_run_id?: string | null;
}

export type RecommendedAction = 'KEEP_READY' | 'STANDBY' | 'SHUTDOWN';
export type ProductionRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Decision {
  id?: number;
  timestamp: number;
  machine_id: string;
  simulation_run_id?: string | null;
  current_state: MachineState;
  recommended_action: RecommendedAction;
  idle_window_min: number;
  keep_ready_energy_kwh?: number;
  standby_energy_kwh?: number | null;
  shutdown_energy_kwh?: number | null;
  selected_energy_kwh?: number;
  estimated_energy_saved_kwh: number;
  estimated_cost_saved: number;
  restart_start_minute?: number | null;
  ready_minute?: number | null;
  production_risk: ProductionRisk;
  reason_code?: string;
  reason: string;
}

export type StrategyType = 'ALWAYS_READY' | 'FIXED_TIMER' | 'IDLEWISE';
export type SimulationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface SimulationRun {
  id: string;
  scenario_name: string;
  strategy: StrategyType;
  status: SimulationStatus;
  total_energy_kwh?: number | null;
  total_cost?: number | null;
  jobs_completed: number;
  late_jobs: number;
  total_delay_minutes: number;
  energy_per_unit?: number | null;
  started_at?: string;
  completed_at?: string | null;
}

export interface HealthResponse {
  status: string;
  service: string;
  environment?: string;
  database: string;
  database_file?: string;
  version?: string;
}

// =============================================================================
// SIMULATION ENGINE TYPES (Prompt 2 & 3)
// =============================================================================

export interface StrategyConfig {
  fixed_timer_threshold_min?: number;
  minimum_saving_kwh?: number;
  allow_shutdown?: boolean;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  machines: number;
  jobs: number;
  shift_minutes: number;
  shift_start_time: string;
  shift_end_time: string;
  electricity_tariff_per_kwh: number;
  currency: string;
}

export interface MachineOverride {
  idle_power_kw?: number;
  standby_power_kw?: number;
  restart_duration_min?: number;
  safety_buffer_min?: number;
}

export interface ScenarioOverrides {
  electricity_tariff_per_kwh?: number;
  machines?: Record<string, MachineOverride>;
}

export interface SimulationRunRequest {
  scenario_id: string;
  strategy: StrategyType;
  strategy_config?: StrategyConfig;
  scenario_overrides?: ScenarioOverrides;
}

export interface MachineResultSummary {
  machine_id: string;
  name: string;
  machine_type: string;
  energy_kwh: number;
  minutes_running: number;
  minutes_idle_ready: number;
  minutes_standby: number;
  minutes_starting: number;
  minutes_off: number;
  jobs_completed: number;
  utilization_percent: number;
  running_energy_kwh?: number;
  idle_energy_kwh?: number;
  standby_energy_kwh?: number;
  restart_energy_kwh?: number;
  off_energy_kwh?: number;
  number_of_standby_events?: number;
  number_of_shutdown_events?: number;
  number_of_restart_events?: number;
}

export interface JobResultSummary {
  id: string;
  job_name: string;
  product_type: string;
  machine_id: string;
  scheduled_start: number;
  actual_start?: number | null;
  actual_end?: number | null;
  duration_min: number;
  deadline: number;
  quantity: number;
  status: JobStatus;
  delay_minutes: number;
}

export interface SimulationResult {
  simulation_run_id: string;
  scenario_id: string;
  scenario_name: string;
  strategy: StrategyType;
  status: SimulationStatus;
  shift_start_time: string;
  shift_end_time: string;
  shift_minutes: number;
  total_energy_kwh: number;
  total_cost: number;
  electricity_tariff_per_kwh: number;
  currency: string;
  total_units_produced: number;
  energy_per_unit: number;
  jobs_completed: number;
  late_jobs: number;
  total_delay_minutes: number;
  factory_utilization_percent: number;
  strategy_config?: StrategyConfig;
  decisions?: Decision[];
  running_energy_kwh?: number;
  idle_energy_kwh?: number;
  standby_energy_kwh?: number;
  restart_energy_kwh?: number;
  off_energy_kwh?: number;
  number_of_standby_events?: number;
  number_of_shutdown_events?: number;
  number_of_restart_events?: number;
  machine_results: MachineResultSummary[];
  job_results: JobResultSummary[];
  telemetry_records?: Telemetry[];
}

export interface StrategyComparisonRequest {
  scenario_id: string;
  fixed_timer_threshold_min?: number;
  minimum_saving_kwh?: number;
  allow_shutdown?: boolean;
  scenario_overrides?: ScenarioOverrides;
}

export interface CompressedTimelineSegment {
  id: string;
  machineId: string;
  state: MachineState;
  startMinute: number;
  endMinute: number;
  durationMin: number;
  startTimeStr: string;
  endTimeStr: string;
  avgPowerKw: number;
  activeJobId?: string | null;
  activeJobName?: string | null;
  nextJobId?: string | null;
  nextJobStart?: string | null;
  associatedDecision?: Decision | PlaybackDecisionEvent | null;
}

export interface StrategyComparisonMetrics {
  baseline_energy_kwh: number;
  fixed_timer_energy_kwh: number;
  idlewise_energy_kwh: number;
  idlewise_vs_baseline_energy_saved_kwh: number;
  idlewise_vs_baseline_percent: number;
  fixed_timer_vs_baseline_energy_saved_kwh: number;
  fixed_timer_vs_baseline_percent: number;
  idlewise_vs_fixed_timer_energy_saved_kwh: number;
  idlewise_vs_fixed_timer_percent: number;
  cost_saved_idlewise_vs_baseline: number;
  cost_saved_idlewise_vs_fixed_timer: number;
  specific_energy_reduction: number;
  production_difference_units: number;
  late_job_difference: number;
  production_preserved: boolean;
}

export interface StrategyComparisonResponse {
  scenario_id: string;
  strategies: {
    ALWAYS_READY: SimulationResult;
    FIXED_TIMER: SimulationResult;
    IDLEWISE: SimulationResult;
  };
  comparison: StrategyComparisonMetrics;
}

// =============================================================================
// PLAYBACK AND STREAMING TYPES (Prompt 4)
// =============================================================================

export interface PlaybackMachineStatic {
  id: string;
  name: string;
  machine_type: string;
  run_power_kw: number;
  idle_power_kw: number;
  standby_power_kw: number;
  off_power_kw: number;
  restart_duration_min: number;
  safety_buffer_min: number;
}

export interface PlaybackMachineState {
  machine_id: string;
  state: MachineState;
  power_kw: number;
  active_job_id?: string | null;
  next_job_id?: string | null;
  next_job_start?: string | null;
  context_note?: string | null;
}

export interface PlaybackDecisionEvent {
  timestamp: number;
  time_str: string;
  machine_id: string;
  recommended_action: RecommendedAction;
  idle_window_min: number;
  estimated_energy_saved_kwh: number;
  estimated_cost_saved: number;
  production_risk: ProductionRisk;
  reason: string;
  reason_code?: string;
}

export interface PlaybackCumulative {
  energy_kwh: number;
  cost: number;
  jobs_completed: number;
  units_produced: number;
  factory_power_kw: number;
}

export interface PlaybackFrame {
  minute_index: number;
  simulation_time: string;
  progress_percent: number;
  machines: PlaybackMachineState[];
  decisions: PlaybackDecisionEvent[];
  cumulative: PlaybackCumulative;
}

export interface PlaybackFinalSummary {
  total_energy_kwh: number;
  total_cost: number;
  jobs_completed: number;
  late_jobs: number;
  total_units_produced: number;
  production_preserved: boolean;
}

export interface PlaybackResponse {
  run_id: string;
  scenario_id: string;
  strategy: StrategyType;
  shift_start: string;
  shift_end: string;
  total_frames: number;
  machines: PlaybackMachineStatic[];
  frames: PlaybackFrame[];
  final_summary: PlaybackFinalSummary;
}
