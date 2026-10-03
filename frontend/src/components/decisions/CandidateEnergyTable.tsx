import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Decision, PlaybackDecisionEvent } from '../../types';

interface CandidateEnergyTableProps {
  decision: Decision | PlaybackDecisionEvent;
}

export const CandidateEnergyTable: React.FC<CandidateEnergyTableProps> = ({ decision }) => {
  const selectedAction = decision.recommended_action;

  // Type guard helpers
  const keepEnergy = 'keep_ready_energy_kwh' in decision && decision.keep_ready_energy_kwh !== undefined
    ? decision.keep_ready_energy_kwh
    : null;

  const standbyEnergy = 'standby_energy_kwh' in decision && decision.standby_energy_kwh !== undefined
    ? decision.standby_energy_kwh
    : null;

  const shutdownEnergy = 'shutdown_energy_kwh' in decision && decision.shutdown_energy_kwh !== undefined
    ? decision.shutdown_energy_kwh
    : null;

  // Format energy number or fallback
  const formatKwh = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return `${val.toFixed(4)} kWh`;
  };

  const candidates = [
    {
      action: 'KEEP_READY',
      label: 'Keep Ready',
      energy: keepEnergy,
      feasible: true,
      description: 'Continuous idle power consumption',
    },
    {
      action: 'STANDBY',
      label: 'Standby',
      energy: standbyEnergy,
      feasible: standbyEnergy !== null,
      description: 'Low-power standby with warmup restart penalty',
    },
    {
      action: 'SHUTDOWN',
      label: 'Shutdown',
      energy: shutdownEnergy,
      feasible: shutdownEnergy !== null,
      description: 'Zero/minimum power with restart warmup & safety buffer',
    },
  ];

  return (
    <div className="border border-industrial-200 rounded-md overflow-hidden bg-white shadow-xs">
      <div className="bg-industrial-50 px-3 py-2 border-b border-industrial-200 text-xs font-semibold text-industrial-700 uppercase tracking-wider">
        Candidate Operating State Evaluation
      </div>

      <table className="min-w-full divide-y divide-industrial-200 text-xs">
        <thead className="bg-industrial-50/50 text-industrial-500 font-medium">
          <tr>
            <th className="px-3 py-2 text-left">Action Option</th>
            <th className="px-3 py-2 text-right">Window Energy</th>
            <th className="px-3 py-2 text-center">Feasible</th>
            <th className="px-3 py-2 text-center">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-industrial-100">
          {candidates.map((c) => {
            const isSelected = selectedAction === c.action;
            return (
              <tr
                key={c.action}
                className={isSelected ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-slate-50'}
              >
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-industrial-900">{c.label}</div>
                  <div className="text-[10px] text-industrial-500 font-normal">{c.description}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-industrial-800">
                  {formatKwh(c.energy)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {c.feasible ? (
                    <span className="text-emerald-700 font-semibold">Yes</span>
                  ) : (
                    <span className="text-industrial-400">No / Prohibited</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {isSelected ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white shadow-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> SELECTED
                    </span>
                  ) : (
                    <span className="text-industrial-400 text-[11px]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
