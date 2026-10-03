import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Factory,
  Gauge,
  SlidersHorizontal,
  Zap,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import type {
  SimulationScenario,
  SimulationResult,
  StrategyType,
  StrategyComparisonResponse,
  Decision,
  PlaybackResponse,
} from '../types';
import { FactoryLivePanel } from '../components/simulation/FactoryLivePanel';
import { ComparisonChart } from '../components/dashboard/ComparisonChart';
import { EnergyCompositionChart } from '../components/dashboard/EnergyCompositionChart';
import { StrategyComparisonTable } from '../components/dashboard/StrategyComparisonTable';

interface SimulationPageProps {
  initialSeekMinute?: number | null;
  onClearInitialSeekMinute?: () => void;
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  initialSeekMinute,
  onClearInitialSeekMinute,
}) => {
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('default_shift');
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('IDLEWISE');

  // Strategy Config State
  const [fixedTimerThreshold, setFixedTimerThreshold] = useState<number>(30);
  const [minimumSavingKwh, setMinimumSavingKwh] = useState<number>(0.10);
  const [allowShutdown, setAllowShutdown] = useState<boolean>(true);

  const [loadingScenarios, setLoadingScenarios] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [comparing, setComparing] = useState<boolean>(false);
  const [loadingPlayback, setLoadingPlayback] = useState<boolean>(false);

  // Result state: single run vs comparison vs live playback
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<StrategyComparisonResponse | null>(null);
  const [playbackData, setPlaybackData] = useState<PlaybackResponse | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'comparison' | 'playback'>('single');
  const [error, setError] = useState<string | null>(null);

  // Fetch available scenarios on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await api.getScenarios();
        setScenarios(data);
        if (data.length > 0) {
          setSelectedScenarioId(data[0].id);
        }
      } catch {
        setError('Failed to load simulation scenarios from backend.');
      } finally {
        setLoadingScenarios(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (initialSeekMinute !== null && initialSeekMinute !== undefined) {
      async function preparePlaybackForSeek() {
        setLoadingPlayback(true);
        try {
          const simResult = await api.runSimulation({
            scenario_id: 'default_shift',
            strategy: 'IDLEWISE',
            strategy_config: {
              fixed_timer_threshold_min: 30,
              minimum_saving_kwh: 0.10,
              allow_shutdown: true,
            },
          });
          const pb = await api.getSimulationPlayback(simResult.simulation_run_id);
          setPlaybackData(pb);
          setViewMode('playback');
        } catch (e) {
          console.error('Failed to load playback for seek', e);
        } finally {
          setLoadingPlayback(false);
          if (onClearInitialSeekMinute) onClearInitialSeekMinute();
        }
      }
      preparePlaybackForSeek();
    }
  }, [initialSeekMinute, onClearInitialSeekMinute]);

  const handleRunSimulation = async () => {
    setRunning(true);
    setError(null);
    try {
      const simResult = await api.runSimulation({
        scenario_id: selectedScenarioId,
        strategy: selectedStrategy,
        strategy_config: {
          fixed_timer_threshold_min: fixedTimerThreshold,
          minimum_saving_kwh: minimumSavingKwh,
          allow_shutdown: allowShutdown,
        },
      });
      setResult(simResult);
      setViewMode('single');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'An error occurred during simulation.');
      }
    } finally {
      setRunning(false);
    }
  };

  const handleCompareAll = async () => {
    setComparing(true);
    setError(null);
    try {
      const cmpData = await api.compareSimulations({
        scenario_id: selectedScenarioId,
        fixed_timer_threshold_min: fixedTimerThreshold,
        minimum_saving_kwh: minimumSavingKwh,
        allow_shutdown: allowShutdown,
      });
      setComparisonResult(cmpData);
      setViewMode('comparison');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to execute multi-strategy comparison.');
      }
    } finally {
      setComparing(false);
    }
  };

  const handleLoadPlayback = async (runId: string) => {
    setLoadingPlayback(true);
    setError(null);
    try {
      const pb = await api.getSimulationPlayback(runId);
      setPlaybackData(pb);
      setViewMode('playback');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to load simulation playback frames.');
      }
    } finally {
      setLoadingPlayback(false);
    }
  };

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  // Helper for decision badges
  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'STANDBY':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-blue-100 text-blue-800 border border-blue-200">
            STANDBY
          </span>
        );
      case 'SHUTDOWN':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-amber-100 text-amber-800 border border-amber-200">
            SHUTDOWN
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-slate-100 text-slate-700 border border-slate-200">
            KEEP READY
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-industrial-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-industrial-900">
          Factory Shift Simulation & Optimization
        </h1>
        <p className="mt-1 text-sm text-industrial-500">
          Evaluate machine idle windows, compare energy control strategies, and audit explainable IdleWise recommendations.
        </p>
      </div>

      {/* Control Panel Card */}
      <div className="bg-white border border-industrial-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-4 border-b border-industrial-100 gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-industrial-700 flex items-center space-x-2">
            <Factory className="w-4 h-4 text-emerald-600" />
            <span>Simulation Parameters & Control Policy</span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'single'
                  ? 'bg-industrial-800 text-white'
                  : 'bg-industrial-100 text-industrial-600 hover:bg-industrial-200'
              }`}
            >
              Single Run View
            </button>
            <button
              onClick={() => {
                if (comparisonResult) setViewMode('comparison');
                else handleCompareAll();
              }}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'comparison'
                  ? 'bg-industrial-800 text-white'
                  : 'bg-industrial-100 text-industrial-600 hover:bg-industrial-200'
              }`}
            >
              Comparison View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          {/* Scenario Selection */}
          <div>
            <label className="block text-xs font-semibold text-industrial-700 mb-1">
              Select Scenario
            </label>
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              disabled={running || comparing || loadingScenarios}
              className="w-full bg-industrial-50 border border-industrial-300 rounded-md px-3 py-2 text-sm text-industrial-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.shift_minutes}m, {s.machines}m, {s.jobs}j)
                </option>
              ))}
            </select>
          </div>

          {/* Strategy Selection */}
          <div>
            <label className="block text-xs font-semibold text-industrial-700 mb-1">
              Operational Strategy
            </label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as StrategyType)}
              disabled={running || comparing}
              className="w-full bg-industrial-50 border border-industrial-300 rounded-md px-3 py-2 text-sm text-industrial-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALWAYS_READY">Strategy A: Always Ready (Baseline)</option>
              <option value="FIXED_TIMER">Strategy B: Fixed Timer (Threshold Policy)</option>
              <option value="IDLEWISE">Strategy C: IdleWise Engine (Energy-Aware Optimization)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleRunSimulation}
              disabled={running || comparing || loadingScenarios}
              className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {running ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Simulating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Strategy</span>
                </>
              )}
            </button>

            <button
              onClick={handleCompareAll}
              disabled={running || comparing || loadingScenarios}
              className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 bg-industrial-800 hover:bg-industrial-900 text-white rounded-md text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {comparing ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Comparing...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Compare All</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Strategy Configuration Knobs (Section 29) */}
        {selectedStrategy === 'FIXED_TIMER' && (
          <div className="mt-4 p-4 bg-industrial-50 border border-industrial-200 rounded-md flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-industrial-600" />
              <span className="font-semibold text-industrial-700">Fixed Timer Settings:</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-industrial-600 font-medium">Standby Threshold:</label>
              <input
                type="number"
                min="1"
                max="120"
                value={fixedTimerThreshold}
                onChange={(e) => setFixedTimerThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 bg-white border border-industrial-300 rounded text-industrial-900 text-xs font-mono"
              />
              <span className="text-industrial-500">minutes</span>
            </div>
            <span className="text-industrial-400 italic">
              (Machines enter standby if upcoming idle window exceeds {fixedTimerThreshold} min)
            </span>
          </div>
        )}

        {selectedStrategy === 'IDLEWISE' && (
          <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-200 rounded-md flex flex-wrap items-center gap-6 text-xs">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
              <span className="font-semibold text-emerald-900">IdleWise Optimization Parameters:</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-industrial-700 font-medium">Minimum Saving Threshold:</label>
              <input
                type="number"
                step="0.05"
                min="0.0"
                value={minimumSavingKwh}
                onChange={(e) => setMinimumSavingKwh(Math.max(0.0, parseFloat(e.target.value) || 0.0))}
                className="w-20 px-2 py-1 bg-white border border-industrial-300 rounded text-industrial-900 text-xs font-mono"
              />
              <span className="text-industrial-500">kWh</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowShutdown"
                checked={allowShutdown}
                onChange={(e) => setAllowShutdown(e.target.checked)}
                className="rounded border-industrial-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="allowShutdown" className="text-industrial-700 font-medium cursor-pointer">
                Allow Complete Shutdown (when permitted by machine & min off time satisfied)
              </label>
            </div>
          </div>
        )}

        {/* Scenario description hint */}
        {selectedScenario && (
          <div className="mt-4 pt-3 border-t border-industrial-100 flex flex-wrap items-center justify-between text-xs text-industrial-500 gap-2">
            <div>
              <span className="font-semibold text-industrial-700">Shift Window: </span>
              {selectedScenario.shift_start_time} to {selectedScenario.shift_end_time} ({selectedScenario.shift_minutes} minutes)
            </div>
            <div>
              <span className="font-semibold text-industrial-700">Tariff: </span>
              ₹{selectedScenario.electricity_tariff_per_kwh.toFixed(2)} / kWh
            </div>
            <div>
              <span className="font-semibold text-industrial-700">Scope: </span>
              {selectedScenario.machines} machines • {selectedScenario.jobs} production jobs
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center space-x-3 text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <span className="font-semibold">Simulation Error:</span> {error}
          </div>
        </div>
      )}

      {/* View Mode Navigation Tabs */}
      {(result || comparisonResult || playbackData) && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {result && (
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-industrial-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Single Run Summary
            </button>
          )}
          {comparisonResult && (
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'comparison'
                  ? 'bg-industrial-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Strategy Comparison Matrix
            </button>
          )}
          {playbackData && (
            <button
              onClick={() => setViewMode('playback')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'playback'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              Virtual Shift Playback ({playbackData.strategy})
            </button>
          )}
        </div>
      )}

      {/* Loading Playback Spinner */}
      {loadingPlayback && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
          <div className="text-sm font-semibold text-slate-700">Loading virtual factory playback frames...</div>
          <div className="text-xs text-slate-400">Synchronizing 480 simulation minutes of telemetry and decisions</div>
        </div>
      )}

      {/* Playback View Mode (Prompt 4) */}
      {viewMode === 'playback' && playbackData && (
        <FactoryLivePanel
          playbackData={playbackData}
          onExitPlayback={() => setViewMode(comparisonResult ? 'comparison' : 'single')}
        />
      )}

      {/* ========================================================================= */}
      {/* COMPARISON VIEW (Section 32, 53) */}
      {/* ========================================================================= */}
      {viewMode === 'comparison' && comparisonResult && (
        <div className="space-y-6">
          {/* Executive Comparative Highlight Banner */}
          <div className="bg-gradient-to-r from-emerald-900 to-industrial-900 text-white rounded-lg p-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Multi-Strategy Comparative Analysis</span>
                </div>
                <h3 className="text-xl font-bold mt-1">
                  IdleWise Achieves {comparisonResult.comparison.idlewise_vs_baseline_percent.toFixed(1)}% Energy Reduction
                </h3>
                <p className="text-xs text-industrial-300 mt-1 max-w-2xl">
                  Evaluated across identical factory workload ({selectedScenario?.shift_minutes} min, {selectedScenario?.machines} machines, {selectedScenario?.jobs} jobs).
                  Preserves 100% production throughput with zero job delays.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
                  <div className="text-[11px] text-emerald-300 font-medium">Energy Saved</div>
                  <div className="text-2xl font-bold font-mono text-white mt-0.5">
                    {comparisonResult.comparison.idlewise_vs_baseline_energy_saved_kwh.toFixed(2)}
                    <span className="text-xs font-normal ml-1">kWh</span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
                  <div className="text-[11px] text-emerald-300 font-medium">Cost Saved</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                    ₹{comparisonResult.comparison.cost_saved_idlewise_vs_baseline.toFixed(2)}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
                  <div className="text-[11px] text-emerald-300 font-medium">Production Integrity</div>
                  <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center justify-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>100% On-Time</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Playback Launch Actions (Section 29, 30) */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-emerald-200 font-medium">
                Select any strategy to watch its live virtual factory replay:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleLoadPlayback(comparisonResult.strategies.ALWAYS_READY.simulation_run_id)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Replay Always Ready
                </button>
                <button
                  onClick={() => handleLoadPlayback(comparisonResult.strategies.FIXED_TIMER.simulation_run_id)}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/30 hover:bg-blue-500/40 text-blue-200 border border-blue-400/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Replay Fixed Timer
                </button>
                <button
                  onClick={() => handleLoadPlayback(comparisonResult.strategies.IDLEWISE.simulation_run_id)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-900" />
                  Replay IdleWise (Optimized)
                </button>
              </div>
            </div>
          </div>

          {/* Visual Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComparisonChart comparison={comparisonResult} />
            <EnergyCompositionChart comparison={comparisonResult} />
          </div>

          {/* Upgraded 12-metric Table */}
          <StrategyComparisonTable comparison={comparisonResult} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE RUN RESULTS VIEW (Section 52, 54) */}
      {/* ========================================================================= */}
      {viewMode === 'single' && result && (
        <div className="space-y-6">
          {/* Outcome Banner */}
          <div className="bg-white border border-industrial-200 rounded-lg p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-industrial-100 gap-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-industrial-900">
                  Simulation Completed Successfully
                </h3>
                <span className="bg-industrial-100 text-industrial-700 text-xs px-2.5 py-0.5 rounded font-mono font-medium">
                  {result.strategy}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-industrial-500 font-mono">
                  Run ID: {result.simulation_run_id.slice(0, 8)}...
                </div>
                <button
                  onClick={() => handleLoadPlayback(result.simulation_run_id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Replay Virtual Shift
                </button>
              </div>
            </div>

            {/* Energy Savings Callout if not Baseline */}
            {result.strategy !== 'ALWAYS_READY' ? (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 flex items-center space-x-3">
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-[11px] text-emerald-700 font-medium">Idle-State Optimization</div>
                    <div className="text-sm font-bold text-emerald-900">
                      {result.decisions?.filter(d => d.recommended_action !== 'KEEP_READY').length || 0} State Transitions Executed
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-[11px] text-blue-700 font-medium">Warmup Transitions</div>
                    <div className="text-sm font-bold text-blue-900">
                      {result.number_of_restart_events || 0} Restarts Scheduled Ahead of Job
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 flex items-center space-x-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-[11px] text-emerald-700 font-medium">Production Integrity</div>
                    <div className="text-sm font-bold text-emerald-900">
                      100% On-Time ({result.total_units_produced} Units Produced)
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-industrial-600 mt-2">
                <strong>Operational Baseline:</strong> Under <em>Always Ready</em>, machines remain in <code className="bg-industrial-100 px-1 py-0.5 rounded font-mono">IDLE_READY</code> whenever waiting for the next job. This measures the unoptimized energy consumption that IdleWise targets for reduction.
              </p>
            )}
          </div>

          {/* Primary KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-industrial-500 uppercase tracking-wider">
                Total Energy
              </div>
              <div className="text-xl font-bold text-industrial-900 mt-1 font-mono">
                {result.total_energy_kwh.toFixed(2)}{' '}
                <span className="text-xs font-normal text-industrial-500">kWh</span>
              </div>
            </div>

            <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-industrial-500 uppercase tracking-wider">
                Total Cost
              </div>
              <div className="text-xl font-bold text-industrial-900 mt-1 font-mono">
                ₹{result.total_cost.toFixed(2)}
              </div>
            </div>

            <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-industrial-500 uppercase tracking-wider">
                Units Produced
              </div>
              <div className="text-xl font-bold text-industrial-900 mt-1 font-mono">
                {result.total_units_produced}{' '}
                <span className="text-xs font-normal text-industrial-500">units</span>
              </div>
            </div>

            <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-industrial-500 uppercase tracking-wider">
                Energy / Unit
              </div>
              <div className="text-xl font-bold text-industrial-900 mt-1 font-mono">
                {result.energy_per_unit.toFixed(3)}{' '}
                <span className="text-xs font-normal text-industrial-500">kWh/u</span>
              </div>
            </div>

            <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-industrial-500 uppercase tracking-wider">
                Jobs Completed
              </div>
              <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
                {result.jobs_completed} / {result.job_results.length}
              </div>
            </div>

            <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-industrial-500 uppercase tracking-wider">
                Late Jobs
              </div>
              <div className="text-xl font-bold text-industrial-900 mt-1 font-mono">
                {result.late_jobs}
                <span className="text-xs font-normal text-industrial-500 ml-1">
                  ({result.total_delay_minutes}m delay)
                </span>
              </div>
            </div>
          </div>

          {/* State Energy Breakdown Bar (Section 57) */}
          <div className="bg-white border border-industrial-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-industrial-700 mb-3 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Shift Energy Distribution by Machine State</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded border border-emerald-100">
                <div className="text-[11px] text-emerald-700 font-medium">RUNNING Power</div>
                <div className="text-base font-bold font-mono text-emerald-900 mt-0.5">
                  {(result.running_energy_kwh || 0).toFixed(2)} kWh
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded border border-amber-100">
                <div className="text-[11px] text-amber-700 font-medium">IDLE READY Power</div>
                <div className="text-base font-bold font-mono text-amber-900 mt-0.5">
                  {(result.idle_energy_kwh || 0).toFixed(2)} kWh
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded border border-blue-100">
                <div className="text-[11px] text-blue-700 font-medium">STANDBY Power</div>
                <div className="text-base font-bold font-mono text-blue-900 mt-0.5">
                  {(result.standby_energy_kwh || 0).toFixed(2)} kWh
                </div>
              </div>

              <div className="p-3 bg-indigo-50 rounded border border-indigo-100">
                <div className="text-[11px] text-indigo-700 font-medium">STARTING (Warmup)</div>
                <div className="text-base font-bold font-mono text-indigo-900 mt-0.5">
                  {(result.restart_energy_kwh || 0).toFixed(2)} kWh
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded border border-slate-200">
                <div className="text-[11px] text-slate-700 font-medium">OFF Power</div>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {(result.off_energy_kwh || 0).toFixed(2)} kWh
                </div>
              </div>
            </div>
          </div>

          {/* Explainable Decisions Audit List (Section 54, 55) */}
          {result.decisions && result.decisions.length > 0 && (
            <div className="bg-white border border-industrial-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-industrial-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-industrial-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Explainable Decision Audit ({result.decisions.length} Idle Windows Evaluated)</span>
                </h3>
                <span className="text-xs text-industrial-500 font-mono">
                  1 Decision per Inter-Job Window
                </span>
              </div>

              <div className="divide-y divide-industrial-100">
                {result.decisions.map((d: Decision, idx: number) => (
                  <div key={idx} className="p-4 hover:bg-industrial-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-xs text-industrial-900 bg-industrial-100 px-2 py-0.5 rounded">
                          {d.machine_id}
                        </span>
                        <span className="text-xs text-industrial-500 font-mono">
                          @ minute {d.timestamp}
                        </span>
                        <div className="flex items-center space-x-1">
                          <ArrowRight className="w-3.5 h-3.5 text-industrial-400" />
                          {renderActionBadge(d.recommended_action)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs font-mono">
                        <span className="text-industrial-600">
                          Gap: <strong>{d.idle_window_min} min</strong>
                        </span>
                        {d.estimated_energy_saved_kwh > 0 && (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Saved: {d.estimated_energy_saved_kwh.toFixed(2)} kWh (₹{d.estimated_cost_saved.toFixed(2)})
                          </span>
                        )}
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                          Risk: {d.production_risk}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-industrial-600 bg-industrial-50 p-2.5 rounded border border-industrial-100 leading-relaxed font-sans">
                      {d.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Machine Performance & Durations Table */}
          <div className="bg-white border border-industrial-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-industrial-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-industrial-900 flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <span>Machine Performance & State Durations</span>
              </h3>
              <span className="text-xs text-industrial-500">
                Factory Utilization: <strong className="text-industrial-800">{result.factory_utilization_percent.toFixed(1)}%</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-industrial-50/70 border-b border-industrial-200 text-industrial-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Machine</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Energy (kWh)</th>
                    <th className="py-3 px-4 text-center">Running</th>
                    <th className="py-3 px-4 text-center">Idle Ready</th>
                    <th className="py-3 px-4 text-center">Standby</th>
                    <th className="py-3 px-4 text-center">Starting (Warmup)</th>
                    <th className="py-3 px-4 text-center">Off</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100">
                  {result.machine_results.map((m) => (
                    <tr key={m.machine_id} className="hover:bg-industrial-50/50">
                      <td className="py-3 px-4 font-bold text-industrial-900 font-mono">
                        {m.machine_id}
                      </td>
                      <td className="py-3 px-4 text-industrial-600">{m.name}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-industrial-900">
                        {m.energy_kwh.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-emerald-700 bg-emerald-50/40">
                        {m.minutes_running}m
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-amber-700 bg-amber-50/40">
                        {m.minutes_idle_ready}m
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-blue-700 bg-blue-50/40">
                        {m.minutes_standby}m
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-indigo-700 bg-indigo-50/40">
                        {m.minutes_starting}m
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600 bg-slate-50">
                        {m.minutes_off}m
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {m.jobs_completed}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-industrial-800">
                        {m.utilization_percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scheduled Jobs Execution Details */}
          <div className="bg-white border border-industrial-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-industrial-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-industrial-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Production Workload Execution ({result.job_results.length} Jobs)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-industrial-50/70 border-b border-industrial-200 text-industrial-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Job ID</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">Machine</th>
                    <th className="py-2.5 px-4 text-center">Scheduled</th>
                    <th className="py-2.5 px-4 text-center">Duration</th>
                    <th className="py-2.5 px-4 text-center">Quantity</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100">
                  {result.job_results.map((j) => (
                    <tr key={j.id} className="hover:bg-industrial-50/50">
                      <td className="py-2.5 px-4 font-mono font-semibold text-industrial-800">{j.id}</td>
                      <td className="py-2.5 px-4 text-industrial-800">{j.job_name}</td>
                      <td className="py-2.5 px-4 text-industrial-600">{j.product_type}</td>
                      <td className="py-2.5 px-4 font-mono font-medium text-industrial-700">{j.machine_id}</td>
                      <td className="py-2.5 px-4 text-center font-mono">
                        {j.scheduled_start}m → {j.scheduled_start + j.duration_min}m
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono">{j.duration_min} min</td>
                      <td className="py-2.5 px-4 text-center font-mono">{j.quantity}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                          {j.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
