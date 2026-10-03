import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import type { Decision, PlaybackDecisionEvent } from '../../types';
import { minuteToTimelinePercent, minuteToShiftTime } from '../../utils/timelineUtils';

interface DecisionMarkerProps {
  decision: Decision | PlaybackDecisionEvent;
  shiftTotalMinutes?: number;
  onSelect: (decision: Decision | PlaybackDecisionEvent) => void;
}

export const DecisionMarker: React.FC<DecisionMarkerProps> = ({
  decision,
  shiftTotalMinutes = 480,
  onSelect,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const leftPercent = minuteToTimelinePercent(decision.timestamp, shiftTotalMinutes);

  const getActionTheme = (action: string) => {
    switch (action) {
      case 'STANDBY':
        return 'bg-blue-600 text-white border-blue-400 ring-blue-300';
      case 'SHUTDOWN':
        return 'bg-amber-600 text-white border-amber-400 ring-amber-300';
      default:
        return 'bg-slate-600 text-white border-slate-400 ring-slate-300';
    }
  };

  const timeStr = 'time_str' in decision && decision.time_str
    ? decision.time_str
    : minuteToShiftTime(decision.timestamp);

  return (
    <div
      style={{ left: `${leftPercent}%` }}
      className="absolute top-0 -translate-x-1/2 -translate-y-2 z-30 group cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(decision);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Decision ${decision.recommended_action} at ${timeStr}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          onSelect(decision);
        }
      }}
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center border shadow-md transform hover:scale-125 transition-transform ring-2 ring-white ${getActionTheme(
          decision.recommended_action
        )}`}
      >
        <Zap className="w-2.5 h-2.5 fill-current" />
      </div>

      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-industrial-900 text-white text-xs rounded-md py-1.5 px-2.5 shadow-xl whitespace-nowrap min-w-[160px] border border-industrial-700">
          <div className="flex items-center justify-between font-semibold border-b border-industrial-800 pb-1 mb-1">
            <span>⚡ {decision.recommended_action}</span>
            <span className="font-mono text-emerald-400 font-bold">{timeStr}</span>
          </div>
          <div className="text-[11px] text-industrial-300 space-y-0.5">
            <div>Idle Window: <span className="font-mono font-medium text-white">{decision.idle_window_min} min</span></div>
            <div>Saved: <span className="font-mono font-bold text-emerald-400">{decision.estimated_energy_saved_kwh.toFixed(2)} kWh</span></div>
          </div>
          <div className="text-[9px] text-industrial-400 mt-1 italic text-center">
            Click to view decision rationale
          </div>
        </div>
      )}
    </div>
  );
};
