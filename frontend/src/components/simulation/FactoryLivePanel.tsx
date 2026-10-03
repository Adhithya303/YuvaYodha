import React, { useState, useMemo } from 'react';
import type { PlaybackResponse, Decision, PlaybackDecisionEvent } from '../../types';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { PlaybackControls } from './PlaybackControls';
import { StrategyBadge } from './StrategyBadge';
import { FactoryPowerCard } from './FactoryPowerCard';
import { ProductionProgress } from './ProductionProgress';
import { MachineLiveCard } from './MachineLiveCard';
import { PowerLiveChart } from './PowerLiveChart';
import { DecisionEventFeed } from './DecisionEventFeed';
import { MachineTimeline } from '../timeline/MachineTimeline';
import { DecisionDetailDrawer } from '../decisions/DecisionDetailDrawer';
import { CheckCircle2, ArrowLeft, Trophy } from 'lucide-react';

interface FactoryLivePanelProps {
  playbackData: PlaybackResponse;
  onExitPlayback: () => void;
}

export const FactoryLivePanel: React.FC<FactoryLivePanelProps> = ({
  playbackData,
  onExitPlayback,
}) => {
  const [selectedDecision, setSelectedDecision] = useState<Decision | PlaybackDecisionEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const {
    currentFrameIndex,
    currentFrame,
    isPlaying,
    speed,
    progressPercent,
    isComplete,
    recentDecisions,
    latestDecision,
    play,
    pause,
    restart,
    seekToMinute,
    stepForward,
    stepBackward,
    setSpeed,
  } = useSimulationPlayback(playbackData);

  const machinesMap = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const m of playbackData.machines) {
      map.set(m.id, m);
    }
    return map;
  }, [playbackData.machines]);

  const allPlaybackDecisions = useMemo(() => {
    const list: PlaybackDecisionEvent[] = [];
    playbackData.frames.forEach((f) => {
      if (f.decisions && f.decisions.length > 0) {
        list.push(...f.decisions);
      }
    });
    return list;
  }, [playbackData.frames]);

  const currentMachineStates = useMemo(() => {
    const map: Record<string, any> = {};
    if (currentFrame?.machines) {
      currentFrame.machines.forEach((m) => {
        map[m.machine_id] = m.state;
      });
    }
    return map;
  }, [currentFrame]);

  const cumulative = currentFrame?.cumulative ?? {
    energy_kwh: 0,
    cost: 0,
    jobs_completed: 0,
    units_produced: 0,
    factory_power_kw: 0,
  };

  const simulationTime = currentFrame?.simulation_time ?? '08:00';
  const shiftMinutesElapsed = currentFrame ? currentFrame.minute_index + 1 : 0;

  return (
    <div className="space-y-6">
      {/* Top Bar: Navigation & Strategy Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitPlayback}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Summary View</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Virtual Factory Shift Replay</h2>
              <StrategyBadge strategy={playbackData.strategy} />
            </div>
            <p className="text-xs text-slate-500">
              Deterministic replay of 480-minute shift telemetry ({playbackData.shift_start} – {playbackData.shift_end})
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Run ID: {playbackData.run_id.slice(0, 8)}...
        </div>
      </div>

      {/* Completion Banner (when shift finishes) */}
      {isComplete && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl p-6 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs">
                <Trophy className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-emerald-200">
                  Virtual Shift Completed (16:00)
                </div>
                <h3 className="text-xl font-bold">
                  {playbackData.strategy === 'IDLEWISE'
                    ? 'IdleWise Optimization Shift Verified'
                    : `${playbackData.strategy} Shift Completed`}
                </h3>
                <div className="text-sm text-emerald-100 flex items-center gap-2 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Production Preserved: 150 / 150 units completed on time with zero delay.</span>
                </div>
              </div>
            </div>

            <button
              onClick={restart}
              className="px-4 py-2 bg-white text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-50 transition-colors shadow-sm self-start sm:self-auto"
            >
              Replay Again
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-500/50 text-xs">
            <div>
              <span className="text-emerald-200">Total Energy:</span>
              <div className="text-base font-bold font-mono">
                {playbackData.final_summary.total_energy_kwh.toFixed(2)} kWh
              </div>
            </div>
            <div>
              <span className="text-emerald-200">Total Cost:</span>
              <div className="text-base font-bold font-mono">
                ₹{playbackData.final_summary.total_cost.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-emerald-200">Units Manufactured:</span>
              <div className="text-base font-bold font-mono">
                {playbackData.final_summary.total_units_produced} / 150
              </div>
            </div>
            <div>
              <span className="text-emerald-200">Late Jobs:</span>
              <div className="text-base font-bold font-mono">
                {playbackData.final_summary.late_jobs}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Playback Transport Bar */}
      <PlaybackControls
        isPlaying={isPlaying}
        speed={speed}
        currentFrameIndex={currentFrameIndex}
        totalFrames={playbackData.total_frames}
        simulationTime={simulationTime}
        progressPercent={progressPercent}
        shiftStart={playbackData.shift_start}
        shiftEnd={playbackData.shift_end}
        onPlay={play}
        onPause={pause}
        onRestart={restart}
        onStepForward={stepForward}
        onStepBackward={stepBackward}
        onSeek={seekToMinute}
        onSetSpeed={setSpeed}
      />

      {/* Real-time KPI Cards */}
      <div className="space-y-4">
        <FactoryPowerCard cumulative={cumulative} shiftMinutesElapsed={shiftMinutesElapsed} />
        <ProductionProgress
          cumulative={cumulative}
          totalJobs={12}
          totalUnitsRequired={playbackData.final_summary.total_units_produced || 150}
        />
      </div>

      {/* Machine Status Cards (3 CNC machines) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Machine Fleet Operational States ({simulationTime})
          </h3>
          <span className="text-xs text-slate-500">Instantaneous Power & Queue Context</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentFrame?.machines.map((m) => (
            <MachineLiveCard
              key={m.machine_id}
              machine={m}
              spec={machinesMap.get(m.machine_id)}
            />
          ))}
        </div>
      </div>

      {/* Machine Operational Gantt Timeline */}
      <MachineTimeline
        machines={playbackData.machines as any}
        frames={playbackData.frames}
        decisions={allPlaybackDecisions}
        currentMinute={currentFrameIndex}
        shiftStartTime={playbackData.shift_start}
        shiftEndTime={playbackData.shift_end}
        currentMachineStates={currentMachineStates}
        onSeekMinute={seekToMinute}
        onSelectDecision={(d) => {
          setSelectedDecision(d);
          setIsDrawerOpen(true);
        }}
      />

      {/* Bottom Grid: Live Power Curve + Live Decision Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PowerLiveChart
          frames={playbackData.frames}
          currentFrameIndex={currentFrameIndex}
          simulationTime={simulationTime}
        />
        <DecisionEventFeed
          decisions={recentDecisions}
          latestDecision={latestDecision}
        />
      </div>

      {/* Decision Detail Drawer */}
      <DecisionDetailDrawer
        decision={selectedDecision}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSeekMinute={(min) => {
          seekToMinute(min);
          setIsDrawerOpen(false);
        }}
      />
    </div>
  );
};

