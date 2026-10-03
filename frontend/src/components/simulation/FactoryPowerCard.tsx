import { Zap, Activity, IndianRupee } from 'lucide-react';
import type { PlaybackCumulative } from '../../types';

interface FactoryPowerCardProps {
  cumulative: PlaybackCumulative;
  shiftMinutesElapsed: number;
}

export const FactoryPowerCard: React.FC<FactoryPowerCardProps> = ({
  cumulative,
  shiftMinutesElapsed,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Instantaneous Factory Power */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
        <div className="p-3 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
          <Zap className="w-6 h-6 fill-amber-500 text-amber-500" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Factory Power
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 flex items-baseline gap-1">
            {cumulative.factory_power_kw.toFixed(2)}
            <span className="text-xs font-medium text-slate-500">kW</span>
          </div>
          <div className="text-[11px] text-slate-400">Sum of 3 CNC machines</div>
        </div>
      </div>

      {/* 2. Cumulative Shift Energy */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Energy Consumed So Far
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 flex items-baseline gap-1">
            {cumulative.energy_kwh.toFixed(4)}
            <span className="text-xs font-medium text-slate-500">kWh</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Exact accumulation ({shiftMinutesElapsed} min)
          </div>
        </div>
      </div>

      {/* 3. Cumulative Cost */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
        <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
          <IndianRupee className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Electricity Cost So Far
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700 flex items-baseline gap-1">
            ₹{cumulative.cost.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">At flat ₹8.00 / kWh tariff</div>
        </div>
      </div>
    </div>
  );
};
