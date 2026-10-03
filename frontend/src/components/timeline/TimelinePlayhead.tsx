import React from 'react';
import { minuteToTimelinePercent, minuteToShiftTime } from '../../utils/timelineUtils';

interface TimelinePlayheadProps {
  currentMinute: number;
  shiftTotalMinutes?: number;
}

export const TimelinePlayhead: React.FC<TimelinePlayheadProps> = ({
  currentMinute,
  shiftTotalMinutes = 480,
}) => {
  const percent = minuteToTimelinePercent(currentMinute, shiftTotalMinutes);
  const timeStr = minuteToShiftTime(currentMinute);

  return (
    <div
      style={{ left: `${percent}%` }}
      className="absolute top-0 bottom-0 pointer-events-none z-40 -translate-x-1/2 flex flex-col items-center transition-all duration-75"
    >
      {/* Time Flag Indicator at top */}
      <div className="bg-rose-600 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-md border border-rose-700 whitespace-nowrap -mt-6 select-none animate-pulse">
        {timeStr} <span className="opacity-80">({currentMinute}m)</span>
      </div>

      {/* Vertical Laser Line */}
      <div className="w-[2px] h-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.8)] opacity-95"></div>
    </div>
  );
};
