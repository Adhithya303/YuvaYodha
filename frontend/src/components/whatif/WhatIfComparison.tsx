import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import type { SimulationResult } from '../../types';

interface WhatIfComparisonProps {
  original: SimulationResult;
  whatIf: SimulationResult;
}

export const WhatIfComparison: React.FC<WhatIfComparisonProps> = ({ original, whatIf }) => {
  const energyDiff = whatIf.total_energy_kwh - original.total_energy_kwh;
  const costDiff = whatIf.total_cost - original.total_cost;
  const energyPctDiff = (energyDiff / (original.total_energy_kwh || 1)) * 100;

  const isProductionSafe =
    whatIf.total_units_produced === original.total_units_produced &&
    whatIf.jobs_completed === original.jobs_completed &&
    whatIf.late_jobs === 0;

  const metrics = [
    {
      label: 'Shift Energy Consumption',
      orig: `${original.total_energy_kwh.toFixed(2)} kWh`,
      sim: `${whatIf.total_energy_kwh.toFixed(2)} kWh`,
      diff: `${energyDiff >= 0 ? '+' : ''}${energyDiff.toFixed(2)} kWh (${energyPctDiff.toFixed(1)}%)`,
      isBetter: energyDiff < -0.001,
      isNeutral: Math.abs(energyDiff) <= 0.001,
    },
    {
      label: 'Simulated Energy Cost',
      orig: `₹${original.total_cost.toFixed(2)}`,
      sim: `₹${whatIf.total_cost.toFixed(2)}`,
      diff: `${costDiff >= 0 ? '+' : ''}₹${costDiff.toFixed(2)}`,
      isBetter: costDiff < -0.01,
      isNeutral: Math.abs(costDiff) <= 0.01,
    },
    {
      label: 'Units Produced',
      orig: `${original.total_units_produced} units`,
      sim: `${whatIf.total_units_produced} units`,
      diff: `${whatIf.total_units_produced - original.total_units_produced} units`,
      isBetter: whatIf.total_units_produced >= original.total_units_produced,
      isNeutral: whatIf.total_units_produced === original.total_units_produced,
    },
    {
      label: 'Late Jobs',
      orig: `${original.late_jobs} jobs`,
      sim: `${whatIf.late_jobs} jobs`,
      diff: `${whatIf.late_jobs - original.late_jobs} jobs`,
      isBetter: whatIf.late_jobs <= original.late_jobs,
      isNeutral: whatIf.late_jobs === original.late_jobs,
    },
    {
      label: 'Standby Events',
      orig: `${original.number_of_standby_events ?? 0}`,
      sim: `${whatIf.number_of_standby_events ?? 0}`,
      diff: `${(whatIf.number_of_standby_events ?? 0) - (original.number_of_standby_events ?? 0)}`,
      isNeutral: true,
    },
    {
      label: 'Shutdown Events',
      orig: `${original.number_of_shutdown_events ?? 0}`,
      sim: `${whatIf.number_of_shutdown_events ?? 0}`,
      diff: `${(whatIf.number_of_shutdown_events ?? 0) - (original.number_of_shutdown_events ?? 0)}`,
      isNeutral: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Safety Status Banner */}
      {isProductionSafe ? (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center space-x-3 text-emerald-900 text-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <strong className="font-bold">Production 100% Preserved:</strong> All 150 finished
            units and 12 jobs completed on schedule with zero late jobs under these assumptions.
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg flex items-center space-x-3 text-rose-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <strong className="font-bold">Production Violation Warning:</strong> Energy changed,
            but production throughput was compromised ({whatIf.late_jobs} late jobs or unit deficit).
            Never celebrate energy savings that violate production delivery constraints!
          </div>
        </div>
      )}

      {/* Side by side comparison table */}
      <div className="bg-white border border-industrial-200 rounded-lg overflow-hidden shadow-xs">
        <table className="min-w-full divide-y divide-industrial-200 text-xs">
          <thead className="bg-industrial-50 text-industrial-600 font-semibold">
            <tr>
              <th className="px-4 py-2.5 text-left">Factory Metric</th>
              <th className="px-4 py-2.5 text-right">Default Shift (Base)</th>
              <th className="px-4 py-2.5 text-right bg-emerald-50/50 text-emerald-900 font-bold border-l border-emerald-100">
                What-If Scenario
              </th>
              <th className="px-4 py-2.5 text-right">Delta (Impact)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-100">
            {metrics.map((m, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-industrial-800">{m.label}</td>
                <td className="px-4 py-2.5 text-right font-mono text-industrial-600">{m.orig}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-industrial-900 bg-emerald-50/30 border-l border-emerald-100">
                  {m.sim}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold">
                  <span
                    className={
                      m.isNeutral
                        ? 'text-industrial-500'
                        : m.isBetter
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }
                  >
                    {m.diff}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
