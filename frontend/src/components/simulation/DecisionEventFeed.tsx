import React, { useState } from 'react';
import type { PlaybackDecisionEvent } from '../../types';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  TrendingDown,
} from 'lucide-react';

interface DecisionEventFeedProps {
  decisions: PlaybackDecisionEvent[];
  latestDecision: PlaybackDecisionEvent | null;
}

export const DecisionEventFeed: React.FC<DecisionEventFeedProps> = ({
  decisions,
  latestDecision,
}) => {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-sm text-slate-800">
            Live Decision Audit Feed
          </h3>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {decisions.length} triggered
          </span>
        </div>
        <div className="text-xs text-slate-400">
          Evaluated strictly at inter-job idle window start
        </div>
      </div>

      {decisions.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs italic">
          No idle window decisions evaluated yet. Advance playback to observe machine job completions.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {decisions
            .slice()
            .reverse()
            .map((d, index) => {
              const isLatest =
                latestDecision &&
                latestDecision.timestamp === d.timestamp &&
                latestDecision.machine_id === d.machine_id;
              const isExpanded = !!expandedIndices[index];

              const isShutdown = d.recommended_action === 'SHUTDOWN';
              const isStandby = d.recommended_action === 'STANDBY';

              return (
                <div
                  key={`${d.machine_id}-${d.timestamp}-${index}`}
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    isLatest
                      ? 'border-emerald-300 bg-emerald-50/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Timestamp + Machine + Action */}
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {d.time_str}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{d.machine_id}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${
                          isShutdown
                            ? 'bg-slate-800 text-white'
                            : isStandby
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {d.recommended_action}
                      </span>
                      {isLatest && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 animate-pulse">
                          Latest Trigger
                        </span>
                      )}
                    </div>

                    {/* Quick Savings Callout */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 font-mono text-emerald-700 font-semibold">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>{d.estimated_energy_saved_kwh.toFixed(2)} kWh saved</span>
                      </div>
                      <div className="text-slate-500 font-mono">
                        (₹{d.estimated_cost_saved.toFixed(2)})
                      </div>
                      <button
                        onClick={() => toggleExpand(index)}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-0.5 font-medium ml-1"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Why?</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="mt-2 text-xs text-slate-600 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Idle Gap: <strong className="text-slate-700">{d.idle_window_min} min</strong>
                    </span>
                    <span>•</span>
                    <span className="text-slate-500">
                      Production Risk: <strong className="text-emerald-700 font-semibold">{d.production_risk}</strong>
                    </span>
                  </div>

                  {/* Expanded Explainability Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5 text-xs text-slate-700 bg-slate-50/70 p-3 rounded-lg">
                      <div className="font-semibold text-slate-800">
                        Operational Rationale & Energy Economics:
                      </div>
                      <p className="leading-relaxed text-slate-600">{d.reason}</p>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
