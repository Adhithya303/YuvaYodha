import React from 'react';
import type {
  CompressedTimelineSegment,
  Decision,
  PlaybackDecisionEvent,
  MachineState,
} from '../../types';
import { TimelineSegment } from './TimelineSegment';
import { DecisionMarker } from './DecisionMarker';

interface TimelineRowProps {
  machineId: string;
  machineName: string;
  machineType?: string;
  currentState?: MachineState;
  segments: CompressedTimelineSegment[];
  decisions: Array<Decision | PlaybackDecisionEvent>;
  shiftTotalMinutes?: number;
  onSegmentClick?: (segment: CompressedTimelineSegment) => void;
  onSelectDecision?: (decision: Decision | PlaybackDecisionEvent) => void;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  machineId,
  machineName,
  machineType,
  currentState,
  segments,
  decisions,
  shiftTotalMinutes = 480,
  onSegmentClick,
  onSelectDecision,
}) => {
  const machineDecisions = decisions.filter((d) => d.machine_id === machineId);

  // Quick state color helper
  const getStateBadge = (state?: MachineState) => {
    switch (state) {
      case 'RUNNING':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'IDLE_READY':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'STANDBY':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'STARTING':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'OFF':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch border-b border-industrial-200 last:border-b-0 py-2.5 hover:bg-slate-50/50 transition-colors">
      {/* Left Column: Machine metadata */}
      <div className="w-full sm:w-48 flex-shrink-0 pr-3 flex flex-row sm:flex-col justify-between sm:justify-center mb-1.5 sm:mb-0">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-industrial-800 text-white shadow-xs">
            {machineId}
          </span>
          <span className="text-xs font-medium text-industrial-800 truncate" title={machineName}>
            {machineName}
          </span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          {machineType && (
            <span className="text-[10px] text-industrial-500 truncate">{machineType}</span>
          )}
          {currentState && (
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${getStateBadge(
                currentState
              )}`}
            >
              {currentState}
            </span>
          )}
        </div>
      </div>

      {/* Right Column: Timeline track */}
      <div className="flex-1 relative flex items-center bg-slate-100 rounded-md overflow-hidden border border-industrial-200 shadow-inner h-10">
        {/* Compressed Segments */}
        <div className="flex w-full h-full">
          {segments.map((segment) => (
            <TimelineSegment
              key={segment.id}
              segment={segment}
              shiftTotalMinutes={shiftTotalMinutes}
              onClick={onSegmentClick}
            />
          ))}
        </div>

        {/* Decision Markers */}
        {machineDecisions.map((d, index) => (
          <DecisionMarker
            key={`${d.machine_id}-${d.timestamp}-${index}`}
            decision={d}
            shiftTotalMinutes={shiftTotalMinutes}
            onSelect={(selected) => onSelectDecision && onSelectDecision(selected)}
          />
        ))}
      </div>
    </div>
  );
};
