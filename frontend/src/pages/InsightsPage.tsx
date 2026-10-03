import React, { useState, useEffect } from 'react';
import {
  Zap,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../services/api';
import type {
  Decision,
  Machine,
  SimulationResult,
} from '../types';
import { DecisionExplorer } from '../components/decisions/DecisionExplorer';
import { WhatIfPanel } from '../components/whatif/WhatIfPanel';

interface InsightsPageProps {
  onSeekToSimulation?: (minute: number) => void;
}

export const InsightsPage: React.FC<InsightsPageProps> = ({ onSeekToSimulation }) => {
  const [activeSubTab, setActiveSubTab] = useState<'decisions' | 'whatif'>('decisions');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [baseResult, setBaseResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Run or fetch baseline IdleWise simulation to ensure decisions are available
        const [simResult, machineList] = await Promise.all([
          api.runSimulation({
            scenario_id: 'default_shift',
            strategy: 'IDLEWISE',
            strategy_config: {
              fixed_timer_threshold_min: 30,
              minimum_saving_kwh: 0.10,
              allow_shutdown: true,
            },
          }),
          api.getMachines(),
        ]);

        setBaseResult(simResult);
        setMachines(machineList);
        setDecisions(simResult.decisions || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load insights data from backend.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-industrial-200 pb-5 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-industrial-900">
            Industrial Insights & Decision Analytics
          </h1>
          <p className="mt-1 text-sm text-industrial-500">
            Audit explainable IdleWise recommendations and experiment with What-If scenario assumptions.
          </p>
        </div>

        {/* Sub Navigation Pill Switcher */}
        <div className="flex items-center space-x-1.5 bg-industrial-100 p-1 rounded-lg border border-industrial-200">
          <button
            onClick={() => setActiveSubTab('decisions')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'decisions'
                ? 'bg-white text-industrial-950 shadow-xs'
                : 'text-industrial-600 hover:text-industrial-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Decision Explorer</span>
          </button>

          <button
            onClick={() => setActiveSubTab('whatif')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'whatif'
                ? 'bg-white text-industrial-950 shadow-xs'
                : 'text-industrial-600 hover:text-industrial-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>What-If Sandbox Lab</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800">
          <strong>Backend Error:</strong> {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white border border-industrial-200 rounded-lg p-12 text-center text-xs text-industrial-500 animate-pulse">
          Loading explainable decision audit log and physics simulation baseline...
        </div>
      )}

      {/* Subtab 1: Decision Explorer */}
      {!loading && activeSubTab === 'decisions' && (
        <DecisionExplorer
          decisions={decisions}
          machines={machines}
          onSeekMinute={onSeekToSimulation}
        />
      )}

      {/* Subtab 2: What-If Sandbox Lab */}
      {!loading && activeSubTab === 'whatif' && baseResult && (
        <WhatIfPanel
          baseResult={baseResult}
          machines={machines}
        />
      )}
    </div>
  );
};
