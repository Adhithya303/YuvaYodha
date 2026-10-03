import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { StrategyComparisonResponse } from '../../types';

interface StrategyComparisonTableProps {
  comparison: StrategyComparisonResponse;
}

export const StrategyComparisonTable: React.FC<StrategyComparisonTableProps> = ({ comparison }) => {
  const c = comparison.comparison;
  const ar = comparison.strategies.ALWAYS_READY;
  const ft = comparison.strategies.FIXED_TIMER;
  const iw = comparison.strategies.IDLEWISE;

  const rows = [
    {
      category: 'Energy Performance',
      label: 'Total Shift Energy',
      unit: 'kWh',
      ar: `${ar?.total_energy_kwh.toFixed(2)} kWh`,
      ft: `${ft?.total_energy_kwh.toFixed(2)} kWh`,
      iw: `${iw?.total_energy_kwh.toFixed(2)} kWh`,
      highlightIw: true,
    },
    {
      category: 'Energy Performance',
      label: 'Energy Saved vs Baseline',
      unit: 'kWh (%)',
      ar: '0.00 kWh (0.00%)',
      ft: `${c.fixed_timer_vs_baseline_energy_saved_kwh.toFixed(2)} kWh (${c.fixed_timer_vs_baseline_percent.toFixed(2)}%)`,
      iw: `${c.idlewise_vs_baseline_energy_saved_kwh.toFixed(2)} kWh (${c.idlewise_vs_baseline_percent.toFixed(2)}%)`,
      highlightIw: true,
    },
    {
      category: 'Energy Performance',
      label: 'Energy Advantage vs Fixed Timer',
      unit: 'kWh (%)',
      ar: '—',
      ft: '—',
      iw: `${c.idlewise_vs_fixed_timer_energy_saved_kwh.toFixed(2)} kWh (${c.idlewise_vs_fixed_timer_percent.toFixed(2)}%)`,
      highlightIw: true,
    },
    {
      category: 'Cost Performance',
      label: 'Total Shift Cost',
      unit: '₹',
      ar: `₹${ar?.total_cost.toFixed(2)}`,
      ft: `₹${ft?.total_cost.toFixed(2)}`,
      iw: `₹${iw?.total_cost.toFixed(2)}`,
      highlightIw: true,
    },
    {
      category: 'Cost Performance',
      label: 'Cost Saved vs Baseline',
      unit: '₹',
      ar: '₹0.00',
      ft: `₹${((ar?.total_cost || 0) - (ft?.total_cost || 0)).toFixed(2)}`,
      iw: `₹${c.cost_saved_idlewise_vs_baseline.toFixed(2)}`,
      highlightIw: true,
    },
    {
      category: 'Efficiency KPI',
      label: 'Specific Energy per Unit',
      unit: 'kWh/unit',
      ar: `${ar?.energy_per_unit.toFixed(3)} kWh/u`,
      ft: `${ft?.energy_per_unit.toFixed(3)} kWh/u`,
      iw: `${iw?.energy_per_unit.toFixed(3)} kWh/u`,
      highlightIw: true,
    },
    {
      category: 'Production Preservation',
      label: 'Units Produced',
      unit: 'units',
      ar: `${ar?.total_units_produced} / 150`,
      ft: `${ft?.total_units_produced} / 150`,
      iw: `${iw?.total_units_produced} / 150`,
      highlightIw: false,
    },
    {
      category: 'Production Preservation',
      label: 'Jobs Completed',
      unit: 'jobs',
      ar: `${ar?.jobs_completed} / 12`,
      ft: `${ft?.jobs_completed} / 12`,
      iw: `${iw?.jobs_completed} / 12`,
      highlightIw: false,
    },
    {
      category: 'Production Preservation',
      label: 'Late Jobs',
      unit: 'jobs',
      ar: `${ar?.late_jobs}`,
      ft: `${ft?.late_jobs}`,
      iw: `${iw?.late_jobs}`,
      highlightIw: false,
    },
    {
      category: 'Operational Transitions',
      label: 'Standby Events',
      unit: 'events',
      ar: `${ar?.number_of_standby_events ?? 0}`,
      ft: `${ft?.number_of_standby_events ?? 0}`,
      iw: `${iw?.number_of_standby_events ?? 0}`,
      highlightIw: false,
    },
    {
      category: 'Operational Transitions',
      label: 'Shutdown Events',
      unit: 'events',
      ar: `${ar?.number_of_shutdown_events ?? 0}`,
      ft: `${ft?.number_of_shutdown_events ?? 0}`,
      iw: `${iw?.number_of_shutdown_events ?? 0}`,
      highlightIw: false,
    },
    {
      category: 'Operational Transitions',
      label: 'Restart Warmup Events',
      unit: 'events',
      ar: `${ar?.number_of_restart_events ?? 0}`,
      ft: `${ft?.number_of_restart_events ?? 0}`,
      iw: `${iw?.number_of_restart_events ?? 0}`,
      highlightIw: false,
    },
  ];

  return (
    <div className="bg-white border border-industrial-200 rounded-lg overflow-hidden shadow-xs">
      <div className="p-4 bg-industrial-50 border-b border-industrial-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-industrial-800">
            Multi-Strategy Industrial Comparison
          </h3>
          <p className="text-xs text-industrial-500">
            Side-by-side performance across 12 rigorous operational, economic, and throughput dimensions.
          </p>
        </div>

        {c.production_preserved ? (
          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
            100% Production Preserved Across All Strategies
          </span>
        ) : (
          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-4 h-4 mr-1 text-amber-600" />
            Warning: Production Discrepancy Detected
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-industrial-200 text-xs">
          <thead className="bg-industrial-100/70 text-industrial-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Evaluation Metric</th>
              <th className="px-4 py-3 text-right font-semibold">
                Strategy A: Always Ready (Baseline)
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                Strategy B: Fixed Timer (30m)
              </th>
              <th className="px-4 py-3 text-right font-bold text-emerald-900 bg-emerald-100/60 border-l border-emerald-200">
                Strategy C: IdleWise (Optimized)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 text-industrial-800 font-medium">
                  {r.label}
                  <span className="ml-1 text-[10px] text-industrial-400 font-normal font-sans">
                    ({r.unit})
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-industrial-600">{r.ar}</td>
                <td className="px-4 py-2.5 text-right font-mono text-industrial-700">{r.ft}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-900 bg-emerald-50/60 border-l border-emerald-200">
                  {r.iw}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
