import React, { useMemo } from 'react';
import { Clock, Layers, Info } from 'lucide-react';
import type {
  Machine,
  PlaybackFrame,
  Telemetry,
  Decision,
  PlaybackDecisionEvent,
  MachineState,
} from '../../types';
import {
  compressMachineTelemetry,
  extractMachineSeriesFromFrames,
  extractMachineSeriesFromTelemetry,
} from '../../utils/timelineUtils';
import { TimelineRow } from './TimelineRow';
import { TimelinePlayhead } from './TimelinePlayhead';

interface MachineTimelineProps {
  machines: Machine[];
  frames?: PlaybackFrame[];
  telemetry?: Telemetry[];
  decisions?: Array<Decision | PlaybackDecisionEvent>;
  currentMinute?: number;
  shiftTotalMinutes?: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
  currentMachineStates?: Record<string, MachineState>;
  onSeekMinute?: (minute: number) => void;
  onSelectDecision?: (decision: Decision | PlaybackDecisionEvent) => void;
}

export const MachineTimeline: React.FC<MachineTimelineProps> = ({
  machines,
  frames,
  telemetry,
  decisions = [],
  currentMinute = 0,
  shiftTotalMinutes = 480,
  shiftStartTime = '08:00',
  shiftEndTime: _shiftEndTime = '16:00',
  currentMachineStates = {},
  onSeekMinute,
  onSelectDecision,
}) => {
  // Generate compressed segments for each machine
  const machineSegments = useMemo(() => {
    const map: Record<string, any[]> = {};

    machines.forEach((m) => {
      if (frames && frames.length > 0) {
        const series = extractMachineSeriesFromFrames(frames, m.id);
        map[m.id] = compressMachineTelemetry(series, m.id, decisions);
      } else if (telemetry && telemetry.length > 0) {
        const series = extractMachineSeriesFromTelemetry(telemetry, m.id);
        map[m.id] = compressMachineTelemetry(series, m.id, decisions);
      } else {
        map[m.id] = [];
      }
    });

    return map;
  }, [machines, frames, telemetry, decisions]);

  // Generate hourly ruler tick markers (e.g. 08:00, 09:00, ..., 16:00)
  const hourTicks = useMemo(() => {
    const ticks = [];
    const step = 60;
    const count = Math.floor(shiftTotalMinutes / step);

    const startH = parseInt(shiftStartTime.split(':')[0]) || 8;
    const startM = parseInt(shiftStartTime.split(':')[1]) || 0;

    for (let i = 0; i <= count; i++) {
      const minOffset = i * step;
      const totalMin = startH * 60 + startM + minOffset;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const percent = (minOffset / shiftTotalMinutes) * 100;
      ticks.push({ minOffset, timeStr, percent });
    }
    return ticks;
  }, [shiftTotalMinutes, shiftStartTime]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeekMinute) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetMinute = Math.round(ratio * shiftTotalMinutes);
    onSeekMinute(targetMinute);
  };

  return (
    <div className="bg-white border border-industrial-200 rounded-lg p-5 shadow-sm space-y-4">
      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-industrial-100 gap-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-base font-bold text-industrial-900">
              Machine Operational Timeline (Gantt)
            </h3>
            <p className="text-xs text-industrial-500">
              Full 8-hour shift state transitions, standby/shutdown idle optimization windows, and synchronized playhead.
            </p>
          </div>
        </div>

        {/* State Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-industrial-600">
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-xs bg-emerald-600 border border-emerald-700"></span>
            <span>Running</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-xs bg-amber-400 border border-amber-500"></span>
            <span>Idle Ready</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-xs bg-blue-500 border border-blue-600"></span>
            <span>Standby</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-xs bg-orange-500 border border-orange-600"></span>
            <span>Starting</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-xs bg-slate-500 border border-slate-600"></span>
            <span>Off</span>
          </div>
          <div className="flex items-center space-x-1 pl-2 border-l border-industrial-200">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px]">
              ⚡
            </span>
            <span>Decision Event</span>
          </div>
        </div>
      </div>

      {/* Main Timeline Scrollable Container */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px] relative">
          {/* Time Ruler Header */}
          <div className="flex items-center mb-1">
            <div className="w-48 flex-shrink-0 text-xs font-semibold text-industrial-500 uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Shift Time</span>
            </div>

            {/* Clickable Ruler Bar */}
            <div
              className="flex-1 relative h-7 cursor-pointer select-none bg-slate-50 border border-industrial-200 rounded-t-md"
              onClick={handleTrackClick}
              title="Click anywhere on the ruler to scrub playback"
            >
              {hourTicks.map((tick) => (
                <div
                  key={tick.minOffset}
                  style={{ left: `${tick.percent}%` }}
                  className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center justify-between"
                >
                  <span className="text-[10px] font-mono font-semibold text-industrial-600 pt-0.5">
                    {tick.timeStr}
                  </span>
                  <div className="w-[1px] h-2 bg-industrial-300"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Machine Rows Container with Overlay Playhead */}
          <div className="relative border-x border-b border-industrial-200 rounded-b-md bg-white">
            {/* Background vertical hour grid lines */}
            <div className="absolute inset-0 pointer-events-none flex pl-48">
              <div className="flex-1 relative h-full">
                {hourTicks.map((tick) => (
                  <div
                    key={`grid-${tick.minOffset}`}
                    style={{ left: `${tick.percent}%` }}
                    className="absolute top-0 bottom-0 w-[1px] bg-industrial-100 border-r border-dashed border-industrial-200/80 -translate-x-1/2"
                  ></div>
                ))}
              </div>
            </div>

            {/* Machine Rows */}
            <div className="relative z-10 divide-y divide-industrial-100">
              {machines.map((machine) => (
                <TimelineRow
                  key={machine.id}
                  machineId={machine.id}
                  machineName={machine.name}
                  machineType={machine.machine_type}
                  currentState={currentMachineStates[machine.id]}
                  segments={machineSegments[machine.id] || []}
                  decisions={decisions}
                  shiftTotalMinutes={shiftTotalMinutes}
                  onSegmentClick={(seg) => onSeekMinute && onSeekMinute(seg.startMinute)}
                  onSelectDecision={onSelectDecision}
                />
              ))}
            </div>

            {/* Interactive Playhead spanning over all tracks */}
            <div className="absolute inset-y-0 right-0 left-48 pointer-events-none z-30">
              <TimelinePlayhead
                currentMinute={currentMinute}
                shiftTotalMinutes={shiftTotalMinutes}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Helpful Hint */}
      <div className="flex items-center space-x-2 text-xs text-industrial-500 pt-1">
        <Info className="w-3.5 h-3.5 text-industrial-400 flex-shrink-0" />
        <span>
          Click on any state segment or ruler timestamp to synchronize virtual playback. Click any ⚡ decision marker to inspect the IdleWise mathematical rationale.
        </span>
      </div>
    </div>
  );
};
