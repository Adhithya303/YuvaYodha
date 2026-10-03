import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  Clock,
} from 'lucide-react';
import type { PlaybackSpeed } from '../../hooks/useSimulationPlayback';

interface PlaybackControlsProps {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentFrameIndex: number;
  totalFrames: number;
  simulationTime: string;
  progressPercent: number;
  shiftStart: string;
  shiftEnd: string;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSeek: (minute: number) => void;
  onSetSpeed: (speed: PlaybackSpeed) => void;
}

const SPEEDS: { value: PlaybackSpeed; label: string; badge?: string }[] = [
  { value: 1, label: '1x' },
  { value: 10, label: '10x' },
  { value: 60, label: '60x' },
  { value: 120, label: '120x' },
  { value: 240, label: '240x', badge: 'Demo' },
];

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  speed,
  currentFrameIndex,
  totalFrames,
  simulationTime,
  progressPercent,
  shiftStart,
  shiftEnd,
  onPlay,
  onPause,
  onRestart,
  onStepForward,
  onStepBackward,
  onSeek,
  onSetSpeed,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* Top Header: Clock & Playback Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Current Time Callout */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-industrial-900 text-white rounded-lg shadow-sm flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span className="font-mono text-xl font-bold tracking-wider">{simulationTime}</span>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Shift Replay Clock
            </div>
            <div className="text-xs text-slate-400">
              {shiftStart} to {shiftEnd} ({currentFrameIndex + 1} / {totalFrames || 480} min)
            </div>
          </div>
        </div>

        {/* Primary Transport Controls */}
        <div className="flex items-center gap-2">
          {/* Restart */}
          <button
            onClick={onRestart}
            title="Restart to 08:00"
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Step Back */}
          <button
            onClick={onStepBackward}
            title="Step Back 1 Minute"
            disabled={currentFrameIndex <= 0}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-sm transition-all ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Play Replay
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            onClick={onStepForward}
            title="Step Forward 1 Minute"
            disabled={totalFrames === 0 || currentFrameIndex >= totalFrames - 1}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <FastForward className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              onClick={() => onSetSpeed(s.value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                speed === s.value
                  ? 'bg-white text-industrial-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>{s.label}</span>
              {s.badge && (
                <span className="bg-emerald-500 text-white text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-tight">
                  {s.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber Progress Slider */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-xs font-medium text-slate-500">
          <span className="font-mono">{shiftStart}</span>
          <span className="text-emerald-700 font-semibold">{progressPercent}% Completed</span>
          <span className="font-mono">{shiftEnd}</span>
        </div>

        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={currentFrameIndex}
            onChange={(e) => onSeek(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>
    </div>
  );
};
