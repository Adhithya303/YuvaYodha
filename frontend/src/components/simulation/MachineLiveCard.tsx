import React from 'react';
import type { PlaybackMachineState, PlaybackMachineStatic, MachineState } from '../../types';
import { Cpu, Zap, ArrowRight, Info } from 'lucide-react';

interface MachineLiveCardProps {
  machine: PlaybackMachineState;
  spec?: PlaybackMachineStatic;
}

const STATE_CONFIG: Record<
  MachineState,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    pulse: boolean;
  }
> = {
  RUNNING: {
    label: 'RUNNING',
    bg: 'bg-emerald-50/40',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    pulse: true,
  },
  IDLE_READY: {
    label: 'IDLE READY',
    bg: 'bg-amber-50/30',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badgeBg: 'bg-amber-100 text-amber-900 border border-amber-300',
    badgeText: 'text-amber-900',
    pulse: false,
  },
  STANDBY: {
    label: 'STANDBY',
    bg: 'bg-blue-50/40',
    border: 'border-blue-300',
    text: 'text-blue-800',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
    pulse: false,
  },
  STARTING: {
    label: 'STARTING',
    bg: 'bg-orange-50/50',
    border: 'border-orange-300',
    text: 'text-orange-800',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white',
    pulse: true,
  },
  OFF: {
    label: 'OFF (SHUTDOWN)',
    bg: 'bg-slate-100/70',
    border: 'border-slate-300',
    text: 'text-slate-600',
    badgeBg: 'bg-slate-700',
    badgeText: 'text-white',
    pulse: false,
  },
};

export const MachineLiveCard: React.FC<MachineLiveCardProps> = ({ machine, spec }) => {
  const cfg = STATE_CONFIG[machine.state] || STATE_CONFIG.IDLE_READY;

  return (
    <div
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 shadow-sm space-y-4 transition-all duration-200`}
    >
      {/* Top Machine Info & State Pill */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs text-slate-700">
            <Cpu className="w-5 h-5 text-industrial-800" />
          </div>
          <div>
            <div className="font-bold text-base text-slate-900 tracking-tight">
              {spec?.name || machine.machine_id}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {spec?.machine_type || 'Industrial CNC'} • ID: {machine.machine_id}
            </div>
          </div>
        </div>

        {/* State Badge */}
        <div className="flex items-center gap-1.5">
          {cfg.pulse && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-2xs ${cfg.badgeBg} ${cfg.badgeText}`}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Power Gauge Box */}
      <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Power
          </span>
        </div>
        <div className="flex items-baseline gap-1 font-mono font-bold text-xl text-slate-900">
          {machine.power_kw.toFixed(2)}
          <span className="text-xs font-medium text-slate-500">kW</span>
        </div>
      </div>

      {/* Production Context: Active vs Next Job */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Active Job */}
        <div className="bg-white/80 rounded-lg p-2.5 border border-slate-200/70">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
            Current Job
          </div>
          <div className="font-mono font-bold text-sm text-slate-800 mt-0.5 truncate">
            {machine.active_job_id ? (
              <span className="text-emerald-700">{machine.active_job_id}</span>
            ) : (
              <span className="text-slate-400 font-normal italic">— None (Idle)</span>
            )}
          </div>
        </div>

        {/* Next Scheduled Job */}
        <div className="bg-white/80 rounded-lg p-2.5 border border-slate-200/70">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight flex items-center gap-1">
            <span>Next Job</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
          <div className="font-mono font-medium text-xs text-slate-800 mt-0.5 truncate">
            {machine.next_job_id ? (
              <span>
                {machine.next_job_id}{' '}
                <span className="text-[11px] text-slate-500 font-normal">
                  ({machine.next_job_start})
                </span>
              </span>
            ) : (
              <span className="text-slate-400 font-normal italic">None queued</span>
            )}
          </div>
        </div>
      </div>

      {/* Contextual Status Note */}
      {machine.context_note && (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white/60 p-2 rounded-lg border border-slate-200/50">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{machine.context_note}</span>
        </div>
      )}
    </div>
  );
};
