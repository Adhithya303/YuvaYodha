import React from 'react';
import { CheckCircle2, PackageCheck, Briefcase } from 'lucide-react';
import type { PlaybackCumulative } from '../../types';

interface ProductionProgressProps {
  cumulative: PlaybackCumulative;
  totalJobs: number;
  totalUnitsRequired: number;
}

export const ProductionProgress: React.FC<ProductionProgressProps> = ({
  cumulative,
  totalJobs = 12,
  totalUnitsRequired = 150,
}) => {
  const unitsPercent = Math.min(
    100,
    Math.round((cumulative.units_produced / totalUnitsRequired) * 100)
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-sm text-slate-800">Live Production Throughput</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Production Safe • 0 Late Jobs
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-1">
        {/* Jobs Completed */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Jobs Completed</div>
            <div className="text-lg font-bold font-mono text-slate-800">
              {cumulative.jobs_completed}{' '}
              <span className="text-xs font-normal text-slate-400">/ {totalJobs}</span>
            </div>
          </div>
        </div>

        {/* Units Produced */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <PackageCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Units Manufactured</div>
            <div className="text-lg font-bold font-mono text-slate-800">
              {cumulative.units_produced}{' '}
              <span className="text-xs font-normal text-slate-400">/ {totalUnitsRequired}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Throughput Progress</span>
          <span className="font-mono font-medium text-slate-600">{unitsPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${unitsPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
