import React from 'react';
import {
  Cpu,
  Zap,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Machine } from '../types';

interface MachinesPageProps {
  machines: Machine[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const MachinesPage: React.FC<MachinesPageProps> = ({
  machines,
  loading,
  error,
  onRefresh,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-industrial-200 pb-5 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-industrial-900">
            Manufacturing Machines & Power Profiles
          </h1>
          <p className="mt-1 text-sm text-industrial-500">
            Energy operating states, power step ratings, restart warmup penalties, and safety constraints.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2 border border-industrial-300 rounded-md text-xs font-semibold text-industrial-700 bg-white hover:bg-industrial-50 transition-colors shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-industrial-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Specifications</span>
        </button>
      </div>

      {/* Error notification */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center space-x-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <span className="font-semibold">API Connection Error:</span> {error}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && machines.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-industrial-200 rounded-lg p-6 shadow-xs animate-pulse space-y-4">
              <div className="h-5 bg-industrial-200 rounded w-1/2"></div>
              <div className="h-4 bg-industrial-100 rounded w-3/4"></div>
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="h-10 bg-industrial-100 rounded"></div>
                <div className="h-10 bg-industrial-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Machine Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {machines.map((machine) => {
          const runPower = machine.run_power_kw || 1;
          const idlePct = (machine.idle_power_kw / runPower) * 100;
          const standbyPct = (machine.standby_power_kw / runPower) * 100;
          const offPct = (machine.off_power_kw / runPower) * 100;

          // Potential instantaneous idle-to-standby power reduction
          const idleToStandbyReduction =
            machine.idle_power_kw > 0
              ? ((machine.idle_power_kw - machine.standby_power_kw) / machine.idle_power_kw) * 100
              : 0;

          return (
            <div
              key={machine.id}
              className="bg-white border border-industrial-200 rounded-lg p-5 shadow-xs hover:border-industrial-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header: ID, Name, Type */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-industrial-800 text-white shadow-xs">
                        {machine.id}
                      </span>
                      <span className="text-xs text-industrial-500 font-medium">
                        {machine.machine_type}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-industrial-900 mt-1.5">
                      {machine.name}
                    </h3>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-industrial-50 flex items-center justify-center border border-industrial-200">
                    <Cpu className="w-4 h-4 text-industrial-600" />
                  </div>
                </div>

                {/* Instantaneous Reduction Opportunity Badge */}
                <div className="mt-3 p-2.5 rounded-md bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-900">
                    Idle → Standby Opportunity:
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    -{idleToStandbyReduction.toFixed(1)}% Power
                  </span>
                </div>

                {/* Power Profile Visual Bars (Section 17) */}
                <div className="mt-4 p-3 bg-slate-50 border border-industrial-200 rounded-md space-y-2">
                  <div className="text-[11px] font-bold text-industrial-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Power Profile Levels</span>
                    <span className="text-industrial-400 font-mono text-[10px]">Active kW</span>
                  </div>

                  {/* RUNNING bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-industrial-600">
                      <span className="font-bold text-emerald-700">RUNNING</span>
                      <span className="font-mono">{machine.run_power_kw} kW</span>
                    </div>
                    <div className="h-2 w-full bg-industrial-200 rounded-xs overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-xs" style={{ width: '100%' }}></div>
                    </div>
                  </div>

                  {/* IDLE bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-industrial-600">
                      <span className="font-bold text-amber-700">IDLE READY</span>
                      <span className="font-mono">{machine.idle_power_kw} kW</span>
                    </div>
                    <div className="h-2 w-full bg-industrial-200 rounded-xs overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-xs"
                        style={{ width: `${Math.min(100, Math.max(8, idlePct))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* STANDBY bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-industrial-600">
                      <span className="font-bold text-blue-700">STANDBY</span>
                      <span className="font-mono">{machine.standby_power_kw} kW</span>
                    </div>
                    <div className="h-2 w-full bg-industrial-200 rounded-xs overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-xs"
                        style={{ width: `${Math.min(100, Math.max(5, standbyPct))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* OFF bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-industrial-600">
                      <span className="font-bold text-slate-700">OFF (Sleep)</span>
                      <span className="font-mono">{machine.off_power_kw} kW</span>
                    </div>
                    <div className="h-2 w-full bg-industrial-200 rounded-xs overflow-hidden">
                      <div
                        className="h-full bg-slate-500 rounded-xs"
                        style={{ width: `${Math.min(100, Math.max(2, offPct))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Operational Constraints & Warmup Parameters */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-industrial-600 py-1 border-b border-industrial-100">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-industrial-400" />
                      <span>Restart Warmup</span>
                    </span>
                    <span className="font-semibold text-industrial-800 font-mono">
                      {machine.restart_duration_min} min ({machine.restart_energy_kwh} kWh)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-industrial-600 py-1 border-b border-industrial-100">
                    <span className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-industrial-400" />
                      <span>Safety Buffer</span>
                    </span>
                    <span className="font-semibold text-industrial-800 font-mono">
                      {machine.safety_buffer_min} min
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-industrial-600 py-1 border-b border-industrial-100">
                    <span className="flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5 text-industrial-400" />
                      <span>Min. Off / Standby</span>
                    </span>
                    <span className="font-semibold text-industrial-800 font-mono">
                      {machine.minimum_off_time_min} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Policy Badges */}
              <div className="pt-3 border-t border-industrial-100 flex items-center justify-between text-xs">
                <div>
                  {machine.standby_allowed ? (
                    <span className="inline-flex items-center text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                      <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> Standby Permitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-industrial-500 bg-industrial-100 px-2 py-0.5 rounded font-medium">
                      <XCircle className="w-3 h-3 mr-1 text-industrial-400" /> Standby Prohibited
                    </span>
                  )}
                </div>

                <div>
                  {machine.shutdown_allowed ? (
                    <span className="inline-flex items-center text-blue-800 bg-blue-50 px-2 py-0.5 rounded font-semibold border border-blue-200">
                      Shutdown OK
                    </span>
                  ) : (
                    <span className="text-industrial-400 font-medium">
                      No Shutdown
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-industrial-400 pt-2">
        Note: Instantaneous reduction indicates theoretical power drop from Idle to Standby. Real shift savings depend on idle gap durations and restart warmup penalties.
      </div>
    </div>
  );
};
