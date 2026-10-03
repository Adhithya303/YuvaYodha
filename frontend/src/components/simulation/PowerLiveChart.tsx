import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { PlaybackFrame } from '../../types';
import { Activity } from 'lucide-react';

interface PowerLiveChartProps {
  frames: PlaybackFrame[];
  currentFrameIndex: number;
  simulationTime: string;
}

export const PowerLiveChart: React.FC<PowerLiveChartProps> = ({
  frames,
  currentFrameIndex,
  simulationTime,
}) => {
  // Downsample to every 5th minute for high-performance rendering (approx 96 points)
  const chartData = useMemo(() => {
    if (!frames || frames.length === 0) return [];

    return frames
      .filter((_, idx) => idx % 5 === 0 || idx === frames.length - 1)
      .map((f) => ({
        minute: f.minute_index,
        time: f.simulation_time,
        powerKw: f.cumulative.factory_power_kw,
        // Active power is only shown up to current playback position for progressive reveal
        activePowerKw:
          f.minute_index <= currentFrameIndex ? f.cumulative.factory_power_kw : null,
      }));
  }, [frames, currentFrameIndex]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-sm text-slate-800">
            Factory Electrical Demand (kW) Replay
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <span className="text-slate-500">Full Shift Profile</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-700 font-medium">Replayed to {simulationTime}</span>
          </div>
        </div>
      </div>

      <div className="h-56 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="activePowerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="totalPowerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              interval={15}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              unit=" kW"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white rounded-lg p-2.5 text-xs shadow-lg space-y-1">
                      <div className="font-semibold text-slate-300">Time: {data.time}</div>
                      <div className="text-emerald-400 font-mono font-bold">
                        Demand: {data.powerKw.toFixed(2)} kW
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Background complete shift outline */}
            <Area
              type="monotone"
              dataKey="powerKw"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              fill="url(#totalPowerGrad)"
              isAnimationActive={false}
            />
            {/* Progressive reveal up to current playhead */}
            <Area
              type="monotone"
              dataKey="activePowerKw"
              stroke="#059669"
              strokeWidth={2.5}
              fill="url(#activePowerGrad)"
              isAnimationActive={false}
            />
            {/* Current playhead time reference line */}
            <ReferenceLine
              x={simulationTime}
              stroke="#047857"
              strokeDasharray="3 3"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
