import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StrategyComparisonResponse } from '../../types';

interface EnergyCompositionChartProps {
  comparison: StrategyComparisonResponse;
}

export const EnergyCompositionChart: React.FC<EnergyCompositionChartProps> = ({ comparison }) => {
  const strategies = comparison.strategies;

  const getComposition = (strategyKey: 'ALWAYS_READY' | 'FIXED_TIMER' | 'IDLEWISE') => {
    const res = strategies[strategyKey];
    if (!res) {
      return { running: 0, idle: 0, standby: 0, restart: 0, off: 0 };
    }
    return {
      running: Number((res.running_energy_kwh || 0).toFixed(2)),
      idle: Number((res.idle_energy_kwh || 0).toFixed(2)),
      standby: Number((res.standby_energy_kwh || 0).toFixed(2)),
      restart: Number((res.restart_energy_kwh || 0).toFixed(2)),
      off: Number((res.off_energy_kwh || 0).toFixed(2)),
    };
  };

  const alwaysComp = getComposition('ALWAYS_READY');
  const fixedComp = getComposition('FIXED_TIMER');
  const idlewiseComp = getComposition('IDLEWISE');

  const data = [
    {
      name: 'Always Ready',
      ...alwaysComp,
    },
    {
      name: 'Fixed Timer',
      ...fixedComp,
    },
    {
      name: 'IdleWise',
      ...idlewiseComp,
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + (Number(p.value) || 0), 0);
      return (
        <div className="bg-industrial-950 text-white p-3 rounded-md shadow-xl text-xs border border-industrial-700 min-w-[200px] space-y-1.5">
          <div className="font-bold text-sm border-b border-industrial-800 pb-1">{label}</div>
          <div className="space-y-1">
            {payload.map((entry: any) => (
              <div key={entry.name} className="flex justify-between items-center text-[11px]">
                <span className="flex items-center space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs"
                    style={{ backgroundColor: entry.color }}
                  ></span>
                  <span className="text-industrial-300">{entry.name}:</span>
                </span>
                <span className="font-mono font-medium text-white">{Number(entry.value).toFixed(2)} kWh</span>
              </div>
            ))}
          </div>
          <div className="pt-1.5 border-t border-industrial-800 flex justify-between font-bold text-emerald-400">
            <span>Total Shift Energy:</span>
            <span className="font-mono">{total.toFixed(2)} kWh</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-industrial-200 rounded-lg p-5 shadow-xs">
      <div className="pb-3 border-b border-industrial-100 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-industrial-800">
          Energy Composition by Operational State
        </h3>
        <p className="text-xs text-industrial-500">
          Stacked breakdown of shift energy consumption. Notice how IdleWise virtually eliminates wasteful Idle Ready energy.
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#1e293b', fontWeight: 600 }} />
            <YAxis unit=" kWh" tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="square"
            />
            <Bar dataKey="running" name="Running" stackId="a" fill="#059669" />
            <Bar dataKey="idle" name="Idle Ready" stackId="a" fill="#f59e0b" />
            <Bar dataKey="standby" name="Standby" stackId="a" fill="#3b82f6" />
            <Bar dataKey="restart" name="Starting Warmup" stackId="a" fill="#f97316" />
            <Bar dataKey="off" name="Off State" stackId="a" fill="#64748b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
