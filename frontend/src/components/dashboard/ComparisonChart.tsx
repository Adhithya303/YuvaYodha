import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { StrategyComparisonResponse } from '../../types';

interface ComparisonChartProps {
  comparison: StrategyComparisonResponse;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({ comparison }) => {
  const c = comparison.comparison;
  const strategies = comparison.strategies;

  const data = [
    {
      name: 'Always Ready',
      strategyKey: 'ALWAYS_READY',
      energy: Number((strategies.ALWAYS_READY?.total_energy_kwh ?? c.baseline_energy_kwh).toFixed(2)),
      cost: Number((strategies.ALWAYS_READY?.total_cost ?? 0).toFixed(2)),
      description: 'Continuous ready baseline between all jobs',
      color: '#64748b', // slate-500
    },
    {
      name: 'Fixed Timer',
      strategyKey: 'FIXED_TIMER',
      energy: Number((strategies.FIXED_TIMER?.total_energy_kwh ?? c.fixed_timer_energy_kwh).toFixed(2)),
      cost: Number((strategies.FIXED_TIMER?.total_cost ?? 0).toFixed(2)),
      description: 'Enters standby after static threshold duration',
      color: '#3b82f6', // blue-500
    },
    {
      name: 'IdleWise',
      strategyKey: 'IDLEWISE',
      energy: Number((strategies.IDLEWISE?.total_energy_kwh ?? c.idlewise_energy_kwh).toFixed(2)),
      cost: Number((strategies.IDLEWISE?.total_cost ?? 0).toFixed(2)),
      description: 'Energy-aware optimization with restart scheduling',
      color: '#059669', // emerald-600
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-industrial-900 text-white p-3 rounded-md shadow-xl text-xs border border-industrial-700 space-y-1">
          <div className="font-bold text-sm">{item.name}</div>
          <div className="text-industrial-300 text-[11px]">{item.description}</div>
          <div className="pt-1.5 border-t border-industrial-800 space-y-0.5">
            <div className="flex justify-between space-x-4">
              <span>Total Energy:</span>
              <span className="font-mono font-bold text-emerald-400">{item.energy.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between space-x-4">
              <span>Shift Cost:</span>
              <span className="font-mono font-medium text-white">₹{item.cost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-industrial-200 rounded-lg p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-industrial-100 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-industrial-800">
            Simulated Shift Energy by Strategy
          </h3>
          <p className="text-xs text-industrial-500">
            Total consumption (kWh) over identical 8-hour factory workload (150 units).
          </p>
        </div>
        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
          IdleWise Saving: {c.idlewise_vs_baseline_percent.toFixed(2)}%
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis
              type="number"
              domain={[0, 'dataMax + 20']}
              unit=" kWh"
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fontWeight: 600, fill: '#1e293b' }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="energy" radius={[0, 4, 4, 0]} barSize={26}>
              {data.map((entry) => (
                <Cell key={`cell-${entry.strategyKey}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
