import React, { useState, useMemo } from 'react';
import { Filter, Award } from 'lucide-react';
import type { Decision, PlaybackDecisionEvent } from '../../types';
import { DecisionListItem } from './DecisionListItem';
import { DecisionDetailDrawer } from './DecisionDetailDrawer';
import { minuteToShiftTime } from '../../utils/timelineUtils';

interface DecisionExplorerProps {
  decisions: Array<Decision | PlaybackDecisionEvent>;
  machines?: Array<{ id: string; name: string }>;
  onSeekMinute?: (minute: number) => void;
}

export const DecisionExplorer: React.FC<DecisionExplorerProps> = ({
  decisions,
  machines = [],
  onSeekMinute,
}) => {
  const [selectedMachine, setSelectedMachine] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [activeDecision, setActiveDecision] = useState<Decision | PlaybackDecisionEvent | null>(
    null
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filtered decisions list
  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      const matchMachine = selectedMachine === 'ALL' || d.machine_id === selectedMachine;
      const matchAction = selectedAction === 'ALL' || d.recommended_action === selectedAction;
      return matchMachine && matchAction;
    });
  }, [decisions, selectedMachine, selectedAction]);

  // Aggregate metrics
  const stats = useMemo(() => {
    const total = decisions.length;
    const standbyCount = decisions.filter((d) => d.recommended_action === 'STANDBY').length;
    const shutdownCount = decisions.filter((d) => d.recommended_action === 'SHUTDOWN').length;
    const keepCount = decisions.filter((d) => d.recommended_action === 'KEEP_READY').length;

    const totalEnergySaved = decisions.reduce(
      (sum, d) => sum + (d.estimated_energy_saved_kwh || 0),
      0
    );
    const totalCostSaved = decisions.reduce(
      (sum, d) => sum + (d.estimated_cost_saved || 0),
      0
    );

    // Highest saving decision dynamically calculated
    let highestSaving: Decision | PlaybackDecisionEvent | null = null;
    let maxSaved = -1;
    for (const d of decisions) {
      if (d.estimated_energy_saved_kwh > maxSaved) {
        maxSaved = d.estimated_energy_saved_kwh;
        highestSaving = d;
      }
    }

    return {
      total,
      standbyCount,
      shutdownCount,
      keepCount,
      totalEnergySaved,
      totalCostSaved,
      highestSaving,
    };
  }, [decisions]);

  const handleInspect = (decision: Decision | PlaybackDecisionEvent) => {
    setActiveDecision(decision);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Aggregation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Decisions */}
        <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-industrial-500 uppercase tracking-wider">
            Total Idle Decisions
          </div>
          <div className="text-2xl font-bold font-mono text-industrial-900 mt-1">
            {stats.total}
          </div>
          <div className="text-[11px] text-industrial-500 mt-1 flex items-center space-x-2">
            <span className="text-blue-700 font-semibold">{stats.standbyCount} Standby</span>
            <span>•</span>
            <span className="text-amber-700 font-semibold">{stats.shutdownCount} Shutdown</span>
          </div>
        </div>

        {/* Total Energy Saved */}
        <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-industrial-500 uppercase tracking-wider">
            Total Decision Savings
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {stats.totalEnergySaved.toFixed(2)}{' '}
            <span className="text-xs font-normal text-emerald-600">kWh</span>
          </div>
          <div className="text-[11px] text-emerald-800 font-mono mt-1">
            ₹{stats.totalCostSaved.toFixed(2)} cost avoided
          </div>
        </div>

        {/* Highest Impact Decision */}
        <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-xs md:col-span-2">
          <div className="text-xs font-semibold text-industrial-500 uppercase tracking-wider flex items-center space-x-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Highest Energy-Saving Decision</span>
          </div>

          {stats.highestSaving ? (
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-industrial-800 text-white">
                    {stats.highestSaving.machine_id}
                  </span>
                  <span className="text-xs font-semibold text-industrial-800 font-mono">
                    @ {minuteToShiftTime(stats.highestSaving.timestamp)}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {stats.highestSaving.recommended_action}
                  </span>
                </div>
                <div className="text-[11px] text-industrial-500 mt-1">
                  Idle window of {stats.highestSaving.idle_window_min} min saved{' '}
                  <strong className="text-emerald-700 font-mono">
                    {stats.highestSaving.estimated_energy_saved_kwh.toFixed(2)} kWh
                  </strong>
                </div>
              </div>

              <button
                onClick={() => handleInspect(stats.highestSaving!)}
                className="px-3 py-1.5 bg-industrial-100 hover:bg-industrial-200 text-industrial-800 rounded-md text-xs font-medium transition-colors"
              >
                Inspect
              </button>
            </div>
          ) : (
            <div className="text-xs text-industrial-400 mt-2">No decisions evaluated yet.</div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-industrial-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-industrial-700">
            Filter Decision Audit Trail:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Machine Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-industrial-500">Machine:</span>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="bg-industrial-50 border border-industrial-300 rounded px-2.5 py-1 text-xs text-industrial-800 font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="ALL">All Machines</option>
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

          {/* Action Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-industrial-500">Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-industrial-50 border border-industrial-300 rounded px-2.5 py-1 text-xs text-industrial-800 font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="STANDBY">Standby</option>
              <option value="SHUTDOWN">Shutdown</option>
              <option value="KEEP_READY">Keep Ready</option>
            </select>
          </div>
        </div>
      </div>

      {/* Decision List */}
      <div className="space-y-3">
        {filteredDecisions.length === 0 ? (
          <div className="bg-white border border-industrial-200 rounded-lg p-8 text-center text-industrial-500 text-sm">
            No decision events match the selected filters.
          </div>
        ) : (
          filteredDecisions.map((decision, idx) => (
            <DecisionListItem
              key={`${decision.machine_id}-${decision.timestamp}-${idx}`}
              decision={decision}
              onInspect={handleInspect}
              onSeekMinute={onSeekMinute}
            />
          ))
        )}
      </div>

      {/* Drawer */}
      <DecisionDetailDrawer
        decision={activeDecision}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSeekMinute={onSeekMinute}
      />
    </div>
  );
};
