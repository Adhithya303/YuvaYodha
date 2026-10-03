import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  RotateCcw,
  ShieldCheck,
  Zap,
  TrendingDown,
  CheckCircle2,
  Clock,
  Layers,
  Play,
} from 'lucide-react';
import type { StrategyComparisonResponse } from '../../types';

interface GuidedDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparison: StrategyComparisonResponse | null;
  onLaunchPlayback?: (seekMinute?: number) => void;
}

export const GuidedDemoModal: React.FC<GuidedDemoModalProps> = ({
  isOpen,
  onClose,
  comparison,
  onLaunchPlayback,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 7;

  // Reset to step 1 when reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const c = comparison?.comparison;
  const baselineKwh = c ? c.baseline_energy_kwh.toFixed(2) : '208.92';
  const fixedKwh = c ? c.fixed_timer_energy_kwh.toFixed(2) : '167.95';
  const idlewiseKwh = c ? c.idlewise_energy_kwh.toFixed(2) : '161.65';
  const energySaved = c ? c.idlewise_vs_baseline_energy_saved_kwh.toFixed(2) : '47.27';
  const percentSaved = c ? c.idlewise_vs_baseline_percent.toFixed(2) : '22.62';
  const costSaved = c ? c.cost_saved_idlewise_vs_baseline.toFixed(2) : '378.15';
  const ftAdvantageKwh = c ? c.idlewise_vs_fixed_timer_energy_saved_kwh.toFixed(2) : '6.30';
  const ftAdvantagePct = c ? c.idlewise_vs_fixed_timer_percent.toFixed(2) : '3.75';

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep((prev) => prev + 1);
    else onClose();
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleRestart = () => {
    setCurrentStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-xl shadow-2xl border border-industrial-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-industrial-950 via-industrial-900 to-slate-900 text-white p-5 flex items-center justify-between border-b border-industrial-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-xs">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                  Interactive Guided Demonstration
                </span>
                <span className="text-industrial-400 text-xs">•</span>
                <span className="text-xs text-industrial-300 font-mono">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              <h2 id="demo-modal-title" className="text-lg font-bold text-white tracking-tight">
                {currentStep === 1 && '1. The Problem: Unproductive Machine Idle Waste'}
                {currentStep === 2 && '2. Three Operational Strategies Evaluated'}
                {currentStep === 3 && '3. Verified Core Result: 22.62% Energy Reduction'}
                {currentStep === 4 && '4. Watch a Decision: CNC-01 at 10:00'}
                {currentStep === 5 && '5. Operational State Transition Sequence'}
                {currentStep === 6 && '6. Transparent Why: Candidate Energy Economics'}
                {currentStep === 7 && '7. Conclusion: Production Protected, Energy Saved'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close guided demo"
            className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-industrial-100 h-1.5">
          <div
            className="bg-emerald-600 h-1.5 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: The Problem */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3 text-amber-900">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm leading-relaxed">
                  <strong className="font-bold text-amber-950">Industrial Reality:</strong> Manufacturing machines spend 30% to 60% of an operational shift waiting between jobs. While waiting, auxiliary pumps, chillers, and spindle electronics remain continuously energized in <code className="bg-amber-100 px-1 rounded font-mono text-xs">IDLE_READY</code>, wasting electricity.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-industrial-200 rounded-lg">
                  <div className="text-xs font-semibold text-industrial-500 uppercase tracking-wider">
                    Baseline Factory Energy (Continuous Ready)
                  </div>
                  <div className="text-3xl font-black font-mono text-industrial-900 mt-2">
                    {baselineKwh} <span className="text-sm font-normal text-industrial-500">kWh</span>
                  </div>
                  <p className="text-xs text-industrial-600 mt-2">
                    In the standard 8-hour shift, all 3 CNC machines remain fully powered between all 12 production jobs.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-industrial-200 rounded-lg">
                  <div className="text-xs font-semibold text-industrial-500 uppercase tracking-wider">
                    The Blind Shutdown Dilemma
                  </div>
                  <div className="text-xs text-industrial-700 space-y-2 mt-2 leading-relaxed">
                    <p>• Restarting machines requires warmup time (4–7 min).</p>
                    <p>• Restarting draws transient electrical energy penalties.</p>
                    <p>• Blind timers don't know when the next job is scheduled, risking production delays.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Three Strategies Compared */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="text-xs text-industrial-600">
                IdleWise evaluates three distinct operational policies under identical deterministic factory conditions (3 CNC machines, 12 production orders, 150 total units):
              </p>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-industrial-200 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-industrial-900">Strategy A: Always Ready</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Baseline</span>
                    </div>
                    <div className="text-xs text-industrial-500 mt-0.5">Continuous idle ready. No transitions.</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-industrial-900">{baselineKwh} kWh</div>
                    <div className="text-[10px] text-industrial-500">₹1,671.33</div>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-blue-950">Strategy B: Fixed Timer (30 min)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Threshold Policy</span>
                    </div>
                    <div className="text-xs text-blue-800 mt-0.5">Enters standby when idle duration exceeds 30 minutes blindly.</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-blue-950">{fixedKwh} kWh</div>
                    <div className="text-[10px] text-blue-700 font-semibold">-19.61% vs Baseline</div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-emerald-950">Strategy C: IdleWise Engine</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">Energy-Aware</span>
                    </div>
                    <div className="text-xs text-emerald-800 mt-0.5">Calculates machine economics, restart penalties, and schedule margins.</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-emerald-950">{idlewiseKwh} kWh</div>
                    <div className="text-[10px] text-emerald-700 font-bold">-22.62% vs Baseline</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Core Result */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-emerald-700 uppercase">Energy Saved</div>
                  <div className="text-2xl font-black font-mono text-emerald-950 mt-1">{energySaved} <span className="text-xs font-normal">kWh</span></div>
                  <div className="text-[10px] font-bold text-emerald-700 font-mono mt-0.5">-{percentSaved}%</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-emerald-700 uppercase">Cost Saved</div>
                  <div className="text-2xl font-black font-mono text-emerald-950 mt-1">₹{costSaved}</div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-0.5">per 8-hour shift</div>
                </div>

                <div className="p-3 bg-slate-50 border border-industrial-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-industrial-600 uppercase">Units Produced</div>
                  <div className="text-2xl font-black font-mono text-industrial-900 mt-1">150 / 150</div>
                  <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">100% Target Met</div>
                </div>

                <div className="p-3 bg-slate-50 border border-industrial-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-industrial-600 uppercase">Late Jobs</div>
                  <div className="text-2xl font-black font-mono text-industrial-900 mt-1">0</div>
                  <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">0m Delay</div>
                </div>
              </div>

              {/* Comparative Advantage */}
              <div className="p-4 bg-slate-50 border border-industrial-200 rounded-lg space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-industrial-800">
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                  <span>Advantage Over Conventional Fixed Timer Policy</span>
                </div>
                <p className="text-xs text-industrial-700 leading-relaxed">
                  IdleWise uses <strong>{ftAdvantagePct}% less energy</strong> than Fixed Timer in the default simulated shift ({ftAdvantageKwh} kWh saved). Unlike a static timer, IdleWise selects deeper shutdown states when safe, and avoids futile cycling on windows where restart penalties exceed savings.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Watch a Decision */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-gradient-to-r from-industrial-900 to-slate-900 text-white rounded-lg space-y-2">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Zap className="w-4 h-4" />
                  <span>Example Decision Walkthrough</span>
                </div>
                <div className="text-base font-bold">
                  CNC-01 at 10:00 (m. 120) — Recommended Action: SHUTDOWN
                </div>
                <p className="text-xs text-industrial-300 leading-relaxed">
                  Job <code className="text-white font-mono">JOB-102</code> completed at 10:00. The next scheduled job <code className="text-white font-mono">JOB-103</code> starts at 11:00. Idle gap is exactly 60 minutes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-industrial-200 rounded-md">
                  <div className="text-industrial-500 font-medium">Idle Window:</div>
                  <div className="font-mono font-bold text-industrial-900 text-sm mt-0.5">60 min</div>
                  <div className="text-[10px] text-industrial-400">10:00 → 11:00</div>
                </div>
                <div className="p-3 bg-slate-50 border border-industrial-200 rounded-md">
                  <div className="text-industrial-500 font-medium">Safe Off Duration:</div>
                  <div className="font-mono font-bold text-industrial-900 text-sm mt-0.5">50 min</div>
                  <div className="text-[10px] text-industrial-400">exceeds 30m min-off</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                  <div className="text-emerald-700 font-medium">Net Energy Saved:</div>
                  <div className="font-mono font-bold text-emerald-950 text-sm mt-0.5">5.02 kWh</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">₹40.13 saved in 1 hr</div>
                </div>
              </div>

              {onLaunchPlayback && (
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => {
                      onLaunchPlayback(120);
                      onClose();
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Jump to Live Simulation at 10:00 (Minute 120)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: State Transition Sequence */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="text-xs text-industrial-600">
                How IdleWise safely navigates the 60-minute gap without risking production delay:
              </p>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="p-3 bg-slate-50 border border-industrial-200 rounded-md flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-industrial-900 w-16">10:00</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-[10px]">OFF (0.1 kW)</span>
                    <span className="text-industrial-600 text-[11px] font-sans">Machine enters safe shutdown.</span>
                  </div>
                  <span className="text-industrial-500 text-[11px]">50 min</span>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-purple-950 w-16">10:50</span>
                    <span className="px-2 py-0.5 rounded bg-purple-700 text-white text-[10px]">STARTING (4.8 kW)</span>
                    <span className="text-purple-800 text-[11px] font-sans">Early warmup begins (R = 5 min).</span>
                  </div>
                  <span className="text-purple-700 text-[11px]">5 min</span>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-amber-950 w-16">10:55</span>
                    <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px]">IDLE_READY (6.0 kW)</span>
                    <span className="text-amber-800 text-[11px] font-sans">Warmup complete. Ready 5 min ahead (B = 5 min).</span>
                  </div>
                  <span className="text-amber-700 text-[11px]">5 min</span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-emerald-950 w-16">11:00</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px]">RUNNING (12.0 kW)</span>
                    <span className="text-emerald-900 text-[11px] font-sans font-bold">JOB-103 begins exactly on schedule. Zero delay.</span>
                  </div>
                  <span className="text-emerald-800 text-[11px] font-bold">ON TIME</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Transparent Candidate Energy */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="text-xs text-industrial-600">
                IdleWise rigorously computes the net energy of all candidate states for each window:
              </p>

              <table className="min-w-full divide-y divide-industrial-200 text-xs border border-industrial-200 rounded-lg overflow-hidden">
                <thead className="bg-industrial-50 text-industrial-600 font-semibold">
                  <tr>
                    <th className="px-3 py-2 text-left">Candidate State</th>
                    <th className="px-3 py-2 text-left">Formula Components</th>
                    <th className="px-3 py-2 text-right">Window kWh</th>
                    <th className="px-3 py-2 text-center">Selected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 font-mono">
                  <tr>
                    <td className="px-3 py-2 font-bold text-industrial-800">KEEP_READY</td>
                    <td className="px-3 py-2 text-industrial-500 text-[11px]">6.0 kW × (60 / 60)</td>
                    <td className="px-3 py-2 text-right font-bold text-industrial-700">6.0000 kWh</td>
                    <td className="px-3 py-2 text-center text-industrial-400">Baseline</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-blue-900">STANDBY</td>
                    <td className="px-3 py-2 text-blue-700 text-[11px]">[1.0 kW × 50/60] + 0.40 kWh + [6.0 kW × 5/60]</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-900">1.7333 kWh</td>
                    <td className="px-3 py-2 text-center text-blue-600">Feasible</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="px-3 py-2 font-bold text-emerald-950 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                      <span>SHUTDOWN</span>
                    </td>
                    <td className="px-3 py-2 text-emerald-800 text-[11px]">[0.1 kW × 50/60] + 0.40 kWh + [6.0 kW × 5/60]</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-950">0.9833 kWh</td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">SELECTED</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 bg-slate-50 border border-industrial-200 rounded-md text-[11px] text-industrial-700 font-sans">
                <strong>Why Shutdown Won:</strong> Both Standby and Shutdown are feasible, but Shutdown uses <strong>0.75 kWh less energy</strong> than Standby, satisfying the 0.10 kWh minimum savings threshold and complying with the 30-minute minimum off-time rule.
              </div>
            </div>
          )}

          {/* STEP 7: Final Conclusion */}
          {currentStep === 7 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-5 bg-gradient-to-br from-emerald-900 via-industrial-950 to-slate-900 text-white rounded-xl space-y-3 shadow-md">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-5 h-5" />
                  <span>The IdleWise Value Proposition</span>
                </div>
                <h3 className="text-xl font-black">
                  Zero Lost Production. 22.62% Less Idle Energy. 100% Explainable.
                </h3>
                <p className="text-xs text-industrial-300 leading-relaxed max-w-2xl">
                  IdleWise provides manufacturing SMEs with an accessible, mathematically rigorous decision layer that turns non-productive idle time into verified energy savings without requiring expensive automation overhauls or risking customer production deadlines.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-industrial-200 rounded-lg">
                  <div className="font-bold text-industrial-900 flex items-center space-x-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Deterministic & Safe</span>
                  </div>
                  <p className="text-industrial-600 text-[11px] leading-relaxed">
                    Always factors in restart duration and safety buffer so incoming jobs never wait.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-industrial-200 rounded-lg">
                  <div className="font-bold text-industrial-900 flex items-center space-x-1.5 mb-1">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>SME Friendly</span>
                  </div>
                  <p className="text-industrial-600 text-[11px] leading-relaxed">
                    Lightweight software layer designed to complement existing energy monitoring systems.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-industrial-200 rounded-lg">
                  <div className="font-bold text-industrial-900 flex items-center space-x-1.5 mb-1">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Auditable Logic</span>
                  </div>
                  <p className="text-industrial-600 text-[11px] leading-relaxed">
                    Every recommendation records exact candidate energy economics and clear operational rationale.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-industrial-50 border-t border-industrial-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRestart}
              className="p-2 text-industrial-500 hover:text-industrial-800 hover:bg-industrial-200/60 rounded-md transition-colors text-xs flex items-center space-x-1"
              title="Restart Demo from Step 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>

            {/* Step Dots */}
            <div className="flex items-center space-x-1 px-2">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx + 1)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    currentStep === idx + 1
                      ? 'bg-emerald-600 w-5'
                      : currentStep > idx + 1
                      ? 'bg-emerald-300'
                      : 'bg-industrial-300'
                  }`}
                  aria-label={`Jump to step ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-industrial-300 rounded-md text-xs font-semibold text-industrial-700 bg-white hover:bg-industrial-50 transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <span>{currentStep === totalSteps ? 'Finish & Explore App' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
