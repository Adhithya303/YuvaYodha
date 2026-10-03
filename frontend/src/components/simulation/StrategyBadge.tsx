import React from 'react';
import type { StrategyType } from '../../types';
import { ShieldCheck, Clock, Zap } from 'lucide-react';

interface StrategyBadgeProps {
  strategy: StrategyType;
  className?: string;
}

export const StrategyBadge: React.FC<StrategyBadgeProps> = ({ strategy, className = '' }) => {
  switch (strategy) {
    case 'IDLEWISE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm ${className}`}
        >
          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          Strategy C: IdleWise Engine
        </span>
      );
    case 'FIXED_TIMER':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          Strategy B: Fixed Timer (30m)
        </span>
      );
    case 'ALWAYS_READY':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 shadow-sm ${className}`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
          Strategy A: Always Ready (Baseline)
        </span>
      );
  }
};
