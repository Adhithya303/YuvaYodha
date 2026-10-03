import React, { useState } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  Play,
  Cpu,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  Machine,
  SimulationResult,
  ScenarioOverrides,
} from '../../types';
import { WhatIfParameter } from './WhatIfParameter';
import { WhatIfComparison } from './WhatIfComparison';

interface WhatIfPanelProps {
  baseResult: SimulationResult;
  machines?: Machine[];
  onWhatIfSimulated?: (result: SimulationResult) => void;
}

export const WhatIfPanel: React.FC<WhatIfPanelProps> = ({
  baseResult,
  machines = [],
  onWhatIfSimulated,
}) => {
  // Strategy Knobs
  const [fixedTimerThreshold, setFixedTimerThreshold] = useState<number>(30);
  const [minimumSavingKwh, setMinimumSavingKwh] = useState<number>(0.10);
  const [allowShutdown, setAllowShutdown] = useState<boolean>(true);

  // Scenario Override Knobs
  const [tariff, setTariff] = useState<number>(8.0);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('CNC-01');

  // Selected Machine overrides
  const [mIdlePower, setMIdlePower] = useState<number>(6.0);
  const [mStandbyPower, setMStandbyPower] = useState<number>(1.0);
  const [mRestartDuration, setMRestartDuration] = useState<number>(5);
  const [mSafetyBuffer, setMSafetyBuffer] = useState<number>(5);

  const [simulating, setSimulating] = useState<boolean>(false);
  const [whatIfResult, setWhatIfResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // When selected machine changes, update initial knob values
  const handleSelectMachine = (mId: string) => {
    setSelectedMachineId(mId);
    const target = machines.find((m) => m.id === mId);
    if (target) {
      setMIdlePower(target.idle_power_kw);
      setMStandbyPower(target.standby_power_kw);
      setMRestartDuration(target.restart_duration_min);
      setMSafetyBuffer(target.safety_buffer_min);
    }
  };

  // Presets
  const applyPreset = (preset: 'normal' | 'conservative' | 'aggressive') => {
    if (preset === 'normal') {
      setFixedTimerThreshold(30);
      setMinimumSavingKwh(0.10);
      setAllowShutdown(true);
      setTariff(8.0);
    } else if (preset === 'conservative') {
      setFixedTimerThreshold(45);
      setMinimumSavingKwh(0.25);
      setAllowShutdown(false); // Shutdown prohibited
    } else if (preset === 'aggressive') {
      setFixedTimerThreshold(15);
      setMinimumSavingKwh(0.02); // Exploit tiny idle windows
      setAllowShutdown(true);
    }
  };

  const handleReset = () => {
    setFixedTimerThreshold(30);
    setMinimumSavingKwh(0.10);
    setAllowShutdown(true);
    setTariff(8.0);
    handleSelectMachine(selectedMachineId);
    setWhatIfResult(null);
    setError(null);
  };

  const handleRunWhatIf = async () => {
    setSimulating(true);
    setError(null);
    try {
      const overrides: ScenarioOverrides = {
        electricity_tariff_per_kwh: tariff,
        machines: {
          [selectedMachineId]: {
            idle_power_kw: mIdlePower,
            standby_power_kw: mStandbyPower,
            restart_duration_min: mRestartDuration,
            safety_buffer_min: mSafetyBuffer,
          },
        },
      };

      const res = await api.runSimulation({
        scenario_id: 'default_shift',
        strategy: 'IDLEWISE',
        strategy_config: {
          fixed_timer_threshold_min: fixedTimerThreshold,
          minimum_saving_kwh: minimumSavingKwh,
          allow_shutdown: allowShutdown,
        },
        scenario_overrides: overrides,
      });

      setWhatIfResult(res);
      if (onWhatIfSimulated) onWhatIfSimulated(res);
    } catch (err: any) {
      setError(err.message || 'What-If simulation failed on backend.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Presets */}
      <div className="bg-white border border-industrial-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-industrial-100 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-industrial-900">What-If Experimentation Sandbox</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                In-Memory Cloned
              </span>
            </div>
            <p className="text-xs text-industrial-500 mt-1">
              Safely explore factory assumptions and machine parameters without modifying base shift records.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-industrial-500 font-medium">Presets:</span>
            <button
              onClick={() => applyPreset('conservative')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-industrial-100 hover:bg-industrial-200 text-industrial-700 transition-colors"
            >
              Conservative
            </button>
            <button
              onClick={() => applyPreset('normal')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-industrial-100 hover:bg-industrial-200 text-industrial-700 transition-colors"
            >
              Default (Normal)
            </button>
            <button
              onClick={() => applyPreset('aggressive')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-industrial-100 hover:bg-industrial-200 text-industrial-700 transition-colors"
            >
              Aggressive
            </button>
          </div>
        </div>

        {/* Form Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <WhatIfParameter
            label="Fixed Timer Threshold"
            description="Standby trigger threshold (min)"
            value={fixedTimerThreshold}
            defaultValue={30}
            min={1}
            max={60}
            step={1}
            unit="min"
            onChange={setFixedTimerThreshold}
          />

          <WhatIfParameter
            label="Min Saving Threshold"
            description="IdleWise minimum required delta"
            value={minimumSavingKwh}
            defaultValue={0.10}
            min={0.01}
            max={1.0}
            step={0.01}
            unit="kWh"
            onChange={setMinimumSavingKwh}
          />

          <WhatIfParameter
            label="Electricity Tariff"
            description="Virtual grid unit cost"
            value={tariff}
            defaultValue={8.0}
            min={1.0}
            max={30.0}
            step={0.5}
            unit="₹/kWh"
            onChange={setTariff}
          />

          {/* Allow Shutdown Toggle Card */}
          <div className="bg-white border border-industrial-200 rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-industrial-800">Allow Shutdown Mode</div>
              <p className="text-[11px] text-industrial-500 mt-0.5">
                Enable evaluation of zero-power deep sleep during long gaps
              </p>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-industrial-700">
                {allowShutdown ? 'ENABLED (OFF OK)' : 'DISABLED (Standby Only)'}
              </span>
              <button
                type="button"
                onClick={() => setAllowShutdown(!allowShutdown)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allowShutdown ? 'bg-emerald-600' : 'bg-industrial-300'
                }`}
                aria-pressed={allowShutdown}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    allowShutdown ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Machine Parameters Override Sub-Section */}
        <div className="mt-5 pt-4 border-t border-industrial-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-industrial-700 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-industrial-600" />
              <span>Machine Rating Overrides:</span>
            </h4>

            {/* Machine Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-industrial-500">Target Machine:</span>
              <select
                value={selectedMachineId}
                onChange={(e) => handleSelectMachine(e.target.value)}
                className="bg-industrial-50 border border-industrial-300 rounded px-3 py-1 text-xs font-semibold text-industrial-900 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                {machines.length > 0 ? (
                  machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} ({m.name})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="CNC-01">CNC-01</option>
                    <option value="CNC-02">CNC-02</option>
                    <option value="CNC-03">CNC-03</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <WhatIfParameter
              label={`${selectedMachineId} Idle Power`}
              value={mIdlePower}
              min={0.5}
              max={25.0}
              step={0.5}
              unit="kW"
              onChange={setMIdlePower}
            />

            <WhatIfParameter
              label={`${selectedMachineId} Standby Power`}
              value={mStandbyPower}
              min={0.1}
              max={10.0}
              step={0.1}
              unit="kW"
              onChange={setMStandbyPower}
            />

            <WhatIfParameter
              label={`${selectedMachineId} Restart Warmup`}
              value={mRestartDuration}
              min={1}
              max={30}
              step={1}
              unit="min"
              onChange={setMRestartDuration}
            />

            <WhatIfParameter
              label={`${selectedMachineId} Safety Buffer`}
              value={mSafetyBuffer}
              min={0}
              max={20}
              step={1}
              unit="min"
              onChange={setMSafetyBuffer}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-4 border-t border-industrial-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={handleReset}
            disabled={simulating}
            className="inline-flex items-center space-x-1.5 px-3 py-2 border border-industrial-300 rounded-md text-xs font-medium text-industrial-700 bg-white hover:bg-industrial-50 transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-industrial-500" />
            <span>Reset to Default Parameters</span>
          </button>

          <button
            onClick={handleRunWhatIf}
            disabled={simulating}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {simulating ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Simulating Backend Physics...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Simulate What-If Assumptions</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-300 rounded-lg p-4 text-xs text-rose-800">
          <strong>Simulation Error:</strong> {error}
        </div>
      )}

      {/* Comparison Results Card */}
      {whatIfResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-industrial-800">
              What-If Outcome vs Original Benchmark
            </h4>
            <span className="text-xs text-industrial-500 font-mono">
              Deterministic Simulation Run ID: {whatIfResult.simulation_run_id.slice(0, 8)}...
            </span>
          </div>

          <WhatIfComparison original={baseResult} whatIf={whatIfResult} />
        </div>
      )}
    </div>
  );
};
