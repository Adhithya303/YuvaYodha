import React, { useState } from 'react';
import type { CompressedTimelineSegment } from '../../types';

interface TimelineSegmentProps {
  segment: CompressedTimelineSegment;
  shiftTotalMinutes?: number;
  onClick?: (segment: CompressedTimelineSegment) => void;
}

export const TimelineSegment: React.FC<TimelineSegmentProps> = ({
  segment,
  shiftTotalMinutes = 480,
  onClick,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Proportional width calculation
  const widthPercent = (segment.durationMin / shiftTotalMinutes) * 100;

  // Semantic styles for industrial machine states
  const getStateStyles = (state: string) => {
    switch (state) {
      case 'RUNNING':
        return {
          bg: 'bg-emerald-600 hover:bg-emerald-500',
          border: 'border-emerald-700',
          text: 'text-white',
          label: 'RUN',
        };
      case 'IDLE_READY':
        return {
          bg: 'bg-amber-400 hover:bg-amber-300',
          border: 'border-amber-500',
          text: 'text-amber-950 font-semibold',
          label: 'IDLE',
        };
      case 'STANDBY':
        return {
          bg: 'bg-blue-500 hover:bg-blue-400',
          border: 'border-blue-600',
          text: 'text-white',
          label: 'STBY',
        };
      case 'STARTING':
        return {
          bg: 'bg-orange-500 hover:bg-orange-400 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.25)_4px,rgba(255,255,255,0.25)_8px)]',
          border: 'border-orange-600',
          text: 'text-white',
          label: 'START',
        };
      case 'OFF':
        return {
          bg: 'bg-slate-500 hover:bg-slate-400',
          border: 'border-slate-600',
          text: 'text-slate-100',
          label: 'OFF',
        };
      default:
        return {
          bg: 'bg-slate-300',
          border: 'border-slate-400',
          text: 'text-slate-800',
          label: state,
        };
    }
  };

  const style = getStateStyles(segment.state);
  const showText = widthPercent >= 3.5;
  const showDetailText = widthPercent >= 9.0;

  return (
    <div
      style={{ width: `${widthPercent}%` }}
      className={`relative h-10 border-r ${style.border} ${style.bg} ${style.text} cursor-pointer transition-colors flex items-center justify-center select-none overflow-hidden group`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => onClick && onClick(segment)}
      role="button"
      tabIndex={0}
      aria-label={`${segment.machineId} ${segment.state} from ${segment.startTimeStr} to ${segment.endTimeStr}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick && onClick(segment);
        }
      }}
    >
      {showText && (
        <div className="flex flex-col items-center justify-center leading-tight px-1 pointer-events-none text-center">
          <span className="text-[11px] font-bold tracking-tight">
            {showDetailText ? segment.state : style.label}
          </span>
          {showDetailText && (
            <span className="text-[9px] opacity-90 font-mono">
              {segment.durationMin}m
            </span>
          )}
        </div>
      )}

      {/* Floating Info Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-industrial-950 text-white border border-industrial-700 text-xs rounded-md py-2 px-3 shadow-xl whitespace-nowrap min-w-[180px]">
          <div className="flex items-center justify-between border-b border-industrial-800 pb-1 mb-1.5">
            <span className="font-bold text-white tracking-wide">{segment.machineId}</span>
            <span className="font-mono text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-[10px]">
              {segment.state}
            </span>
          </div>

          <div className="space-y-1 text-[11px] text-industrial-300">
            <div className="flex justify-between">
              <span>Time Window:</span>
              <span className="font-mono font-semibold text-white">
                {segment.startTimeStr} — {segment.endTimeStr} ({segment.durationMin} min)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Average Power:</span>
              <span className="font-mono font-semibold text-white">
                {segment.avgPowerKw.toFixed(2)} kW
              </span>
            </div>
            {segment.activeJobId && (
              <div className="flex justify-between">
                <span>Active Job:</span>
                <span className="font-mono text-emerald-300 font-semibold">{segment.activeJobId}</span>
              </div>
            )}
            {segment.nextJobId && !segment.activeJobId && (
              <div className="flex justify-between">
                <span>Next Job:</span>
                <span className="font-mono text-amber-300">
                  {segment.nextJobId} {segment.nextJobStart ? `(${segment.nextJobStart})` : ''}
                </span>
              </div>
            )}
            {segment.associatedDecision && (
              <div className="pt-1 mt-1 border-t border-industrial-800 text-[10px] text-blue-300">
                ⚡ IdleWise Decision: {segment.associatedDecision.recommended_action} (Saved: {segment.associatedDecision.estimated_energy_saved_kwh?.toFixed(2)} kWh)
              </div>
            )}
          </div>
          <div className="text-[9px] text-industrial-400 mt-1 italic text-center">
            Click to seek playback to {segment.startTimeStr}
          </div>
        </div>
      )}
    </div>
  );
};
