import React from 'react';
import { Play, ArrowRight, Clock } from 'lucide-react';
import type { Decision, PlaybackDecisionEvent } from '../../types';
import { minuteToShiftTime } from '../../utils/timelineUtils';

interface DecisionListItemProps {
  decision: Decision | PlaybackDecisionEvent;
  onInspect: (decision: Decision | PlaybackDecisionEvent) => void;
  onSeekMinute?: (minute: number) => void;
}

export const DecisionListItem: React.FC<DecisionListItemProps> = ({
  decision,
  onInspect,
  onSeekMinute,
}) => {
  const timeStr = 'time_str' in decision && decision.time_str
    ? decision.time_str
    : minuteToShiftTime(decision.timestamp);

  const nextJobTime = decision.timestamp + decision.idle_window_min;
  const nextJobTimeStr = minuteToShiftTime(nextJobTime);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'STANDBY':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SHUTDOWN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-industrial-200 rounded-lg p-4 shadow-xs hover:border-industrial-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Left side: Machine, Time, Action, Reason snippet */}
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center space-x-2.5">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-industrial-800 text-white">
            {decision.machine_id}
          </span>
          <span className="font-mono text-xs font-semibold text-industrial-600 flex items-center space-x-1">
            <Clock className="w-3 h-3 text-industrial-400" />
            <span>{timeStr}</span>
          </span>
          <span
            className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${getActionBadge(
              decision.recommended_action
            )}`}
          >
            {decision.recommended_action}
          </span>
        </div>

        <p className="text-xs text-industrial-700 line-clamp-1">
          {decision.reason}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-industrial-500">
          <span>
            Idle Gap: <strong className="font-mono text-industrial-800">{decision.idle_window_min} min</strong>
          </span>
          <span>
            Next Job: <strong className="font-mono text-industrial-800">{nextJobTimeStr}</strong>
          </span>
        </div>
      </div>

      {/* Middle side: Energy & Cost Savings */}
      <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-industrial-100 pt-2 sm:pt-0 sm:pl-4 flex-shrink-0">
        <div className="text-sm font-bold font-mono text-emerald-700">
          +{decision.estimated_energy_saved_kwh.toFixed(3)} kWh
        </div>
        <div className="text-xs text-industrial-500 font-mono">
          Saved ₹{decision.estimated_cost_saved.toFixed(2)}
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        <button
          onClick={() => onInspect(decision)}
          className="px-3 py-1.5 bg-industrial-50 hover:bg-industrial-100 text-industrial-800 border border-industrial-200 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1"
        >
          <span>Inspect Why</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        {onSeekMinute && (
          <button
            onClick={() => onSeekMinute(decision.timestamp)}
            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md transition-colors"
            title={`Seek playback to ${timeStr}`}
            aria-label={`Seek playback to ${timeStr}`}
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
