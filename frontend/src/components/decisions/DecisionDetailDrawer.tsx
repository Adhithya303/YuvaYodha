import React, { useState } from 'react';
import {
  X,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Play,
  Calculator,
} from 'lucide-react';
import type { Decision, PlaybackDecisionEvent } from '../../types';
import { CandidateEnergyTable } from './CandidateEnergyTable';
import { minuteToShiftTime } from '../../utils/timelineUtils';

interface DecisionDetailDrawerProps {
  decision: Decision | PlaybackDecisionEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSeekMinute?: (minute: number) => void;
}

export const DecisionDetailDrawer: React.FC<DecisionDetailDrawerProps> = ({
  decision,
  isOpen,
  onClose,
  onSeekMinute,
}) => {
  const [showMath, setShowMath] = useState(false);

  if (!isOpen || !decision) return null;

  const timeStr = 'time_str' in decision && decision.time_str
    ? decision.time_str
    : minuteToShiftTime(decision.timestamp);

  const restartMinute = 'restart_start_minute' in decision && decision.restart_start_minute !== null && decision.restart_start_minute !== undefined
    ? decision.restart_start_minute
    : null;

  const readyMinute = 'ready_minute' in decision && decision.ready_minute !== null && decision.ready_minute !== undefined
    ? decision.ready_minute
    : null;

  const nextJobTime = decision.timestamp + decision.idle_window_min;
  const nextJobTimeStr = minuteToShiftTime(nextJobTime);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'STANDBY':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'SHUTDOWN':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-industrial-950/40 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-industrial-200 overflow-y-auto animate-slideLeft"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-industrial-200 px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-industrial-800 text-white">
              {decision.machine_id}
            </span>
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${getActionBadge(
                  decision.recommended_action
                )}`}
              >
                {decision.recommended_action}
              </span>
              <span className="text-xs text-industrial-500 font-mono">
                @ {timeStr}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-industrial-400 hover:text-industrial-700 hover:bg-industrial-100 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Top Impact Banner */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg">
            <div>
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Energy Saved
              </div>
              <div className="text-xl font-bold font-mono text-emerald-950 mt-0.5">
                {decision.estimated_energy_saved_kwh.toFixed(3)}{' '}
                <span className="text-xs font-normal text-emerald-700">kWh</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Cost Saved
              </div>
              <div className="text-xl font-bold font-mono text-emerald-950 mt-0.5">
                ₹{decision.estimated_cost_saved.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Idle Window
              </div>
              <div className="text-xl font-bold font-mono text-emerald-950 mt-0.5">
                {decision.idle_window_min}{' '}
                <span className="text-xs font-normal text-emerald-700">min</span>
              </div>
            </div>
          </div>

          {/* Plain English Rationale */}
          <div>
            <h4 className="text-xs font-bold text-industrial-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Operational Rationale</span>
            </h4>
            <div className="p-3.5 bg-slate-50 border border-industrial-200 rounded-md text-sm text-industrial-800 leading-relaxed font-normal">
              {decision.reason}
            </div>
          </div>

          {/* Candidate Energy Evaluation Table */}
          <div>
            <h4 className="text-xs font-bold text-industrial-700 uppercase tracking-wider mb-2">
              Optimization Analysis
            </h4>
            <CandidateEnergyTable decision={decision} />
          </div>

          {/* Restart Timing & Production Safety */}
          <div>
            <h4 className="text-xs font-bold text-industrial-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Production Schedule & Safety Buffer</span>
            </h4>

            <div className="bg-white border border-industrial-200 rounded-md p-4 space-y-3 text-xs shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-industrial-100">
                <span className="text-industrial-600">Decision Timestamp (Idle Begins):</span>
                <span className="font-mono font-semibold text-industrial-900">{timeStr} (m. {decision.timestamp})</span>
              </div>

              {restartMinute !== null && (
                <div className="flex items-center justify-between pb-2 border-b border-industrial-100">
                  <span className="text-industrial-600">Restart Warmup Trigger:</span>
                  <span className="font-mono font-semibold text-orange-700">
                    {minuteToShiftTime(restartMinute)} (m. {restartMinute})
                  </span>
                </div>
              )}

              {readyMinute !== null && (
                <div className="flex items-center justify-between pb-2 border-b border-industrial-100">
                  <span className="text-industrial-600">Machine Fully Ready:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {minuteToShiftTime(readyMinute)} (m. {readyMinute})
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-industrial-100">
                <span className="text-industrial-600">Next Scheduled Job:</span>
                <span className="font-mono font-semibold text-industrial-900">
                  {nextJobTimeStr} (m. {nextJobTime})
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-emerald-800">Production Impact:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Preserved (0 Job Delays)
                </span>
              </div>
            </div>
          </div>

          {/* Expandable Technical Calculation Details */}
          <div className="border border-industrial-200 rounded-md overflow-hidden bg-white">
            <button
              onClick={() => setShowMath(!showMath)}
              className="w-full px-4 py-2.5 bg-industrial-50 hover:bg-industrial-100 flex items-center justify-between text-xs font-semibold text-industrial-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-industrial-500" />
                <span>View Mathematical Formulations</span>
              </div>
              {showMath ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMath && (
              <div className="p-4 space-y-3 bg-slate-50 text-xs text-industrial-700 border-t border-industrial-200 font-mono">
                <div className="p-2.5 bg-white border border-industrial-200 rounded">
                  <div className="font-bold text-industrial-900 mb-1">E_keep (Continuous Ready Baseline):</div>
                  <div className="text-industrial-600 text-[11px]">
                    E_keep = P_idle × (G / 60)
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-industrial-200 rounded">
                  <div className="font-bold text-industrial-900 mb-1">E_standby (Low-Power Standby):</div>
                  <div className="text-industrial-600 text-[11px]">
                    E_standby = [P_standby × (G - R - B) / 60] + E_restart + [P_idle × (B / 60)]
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-industrial-200 rounded">
                  <div className="font-bold text-industrial-900 mb-1">E_shutdown (Off Mode):</div>
                  <div className="text-industrial-600 text-[11px]">
                    E_shutdown = [P_off × (G - R - B) / 60] + E_restart + [P_idle × (B / 60)]
                  </div>
                </div>

                <div className="text-[11px] text-industrial-500 font-sans italic">
                  Where G = idle gap, R = warmup restart duration, B = safety buffer duration, and E_restart = warmup restart energy penalty.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-industrial-200 px-6 py-4 flex items-center justify-between gap-3 shadow-md">
          {onSeekMinute && (
            <button
              onClick={() => {
                onSeekMinute(decision.timestamp);
                onClose();
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Seek Playback to {timeStr}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 border border-industrial-300 rounded-md text-xs font-medium text-industrial-700 hover:bg-industrial-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
