import React from 'react';

interface WhatIfParameterProps {
  label: string;
  description?: string;
  value: number;
  defaultValue?: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  onChange: (val: number) => void;
}

export const WhatIfParameter: React.FC<WhatIfParameterProps> = ({
  label,
  description,
  value,
  defaultValue,
  min,
  max,
  step,
  unit,
  disabled = false,
  onChange,
}) => {
  const isModified = defaultValue !== undefined && Math.abs(value - defaultValue) > 0.0001;

  return (
    <div className="bg-white border border-industrial-200 rounded-lg p-3.5 shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-industrial-800 flex items-center space-x-1.5">
            <span>{label}</span>
            {isModified && (
              <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                Modified
              </span>
            )}
          </label>
          {description && (
            <p className="text-[11px] text-industrial-500 mt-0.5">{description}</p>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                onChange(Math.max(min, Math.min(max, val)));
              }
            }}
            className="w-20 px-2 py-1 bg-slate-50 border border-industrial-300 rounded text-xs font-mono font-bold text-industrial-900 text-right focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
          />
          {unit && <span className="text-xs font-medium text-industrial-500">{unit}</span>}
        </div>
      </div>

      <div className="pt-1 flex items-center space-x-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1.5 bg-industrial-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-50"
        />
        {defaultValue !== undefined && (
          <span className="text-[10px] text-industrial-400 font-mono">
            Default: {defaultValue} {unit}
          </span>
        )}
      </div>
    </div>
  );
};
