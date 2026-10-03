import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'info' | 'neutral';
  highlight?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  subtext,
  badge,
  badgeType = 'neutral',
  highlight = false,
}) => {
  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'success':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'info':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className={`rounded-lg p-4 border transition-all ${
        highlight
          ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
          : 'bg-white border-industrial-200 shadow-xs hover:border-industrial-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-industrial-500">
          {label}
        </span>
        {badge && (
          <span
            className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${getBadgeStyle()}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline space-x-1.5">
        <span className="text-2xl font-bold font-mono tracking-tight text-industrial-900">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-industrial-500">{unit}</span>}
      </div>

      {subtext && <div className="mt-1 text-[11px] text-industrial-500 truncate">{subtext}</div>}
    </div>
  );
};
