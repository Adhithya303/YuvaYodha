/**
 * React hook controlling accelerated virtual factory simulation playback.
 * Provides deterministic minute-by-minute replay using stored telemetry frames.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { PlaybackResponse, PlaybackFrame, PlaybackDecisionEvent } from '../types';

export type PlaybackSpeed = 1 | 10 | 60 | 120 | 240;

const SPEED_INTERVAL_MS: Record<PlaybackSpeed, number> = {
  1: 1000,
  10: 300,
  60: 100,
  120: 50,
  240: 20,
};

export interface UseSimulationPlaybackReturn {
  currentFrameIndex: number;
  currentFrame: PlaybackFrame | null;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  progressPercent: number;
  isComplete: boolean;
  recentDecisions: PlaybackDecisionEvent[];
  latestDecision: PlaybackDecisionEvent | null;
  play: () => void;
  pause: () => void;
  restart: () => void;
  seekToMinute: (minute: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
}

export function useSimulationPlayback(
  playbackData: PlaybackResponse | null
): UseSimulationPlaybackReturn {
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(60);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Total available frames in loaded shift
  const totalFrames = playbackData?.frames.length ?? 0;

  // Reset playback position whenever a new simulation run is loaded
  useEffect(() => {
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  }, [playbackData?.run_id]);

  // Derived current frame
  const currentFrame = useMemo<PlaybackFrame | null>(() => {
    if (!playbackData || totalFrames === 0) return null;
    const clampedIndex = Math.min(Math.max(0, currentFrameIndex), totalFrames - 1);
    return playbackData.frames[clampedIndex] ?? null;
  }, [playbackData, currentFrameIndex, totalFrames]);

  const isComplete = totalFrames > 0 && currentFrameIndex >= totalFrames - 1;

  // Derive all decisions that have occurred up through the current playback minute
  const recentDecisions = useMemo<PlaybackDecisionEvent[]>(() => {
    if (!playbackData) return [];
    const decisions: PlaybackDecisionEvent[] = [];
    const limit = Math.min(currentFrameIndex, totalFrames - 1);
    for (let i = 0; i <= limit; i++) {
      const frame = playbackData.frames[i];
      if (frame?.decisions && frame.decisions.length > 0) {
        decisions.push(...frame.decisions);
      }
    }
    return decisions;
  }, [playbackData, currentFrameIndex, totalFrames]);

  const latestDecision = recentDecisions.length > 0 ? recentDecisions[recentDecisions.length - 1] : null;

  const progressPercent = currentFrame?.progress_percent ?? 0;

  // Playback advancement loop
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const intervalMs = SPEED_INTERVAL_MS[speed] ?? 100;

    timerRef.current = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev >= totalFrames - 1) {
          setIsPlaying(false);
          return totalFrames - 1;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, speed, totalFrames]);

  const play = useCallback(() => {
    if (totalFrames === 0) return;
    if (currentFrameIndex >= totalFrames - 1) {
      setCurrentFrameIndex(0);
    }
    setIsPlaying(true);
  }, [totalFrames, currentFrameIndex]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  }, []);

  const seekToMinute = useCallback(
    (minute: number) => {
      setIsPlaying(false); // Auto-pause on scrub per Section 46
      if (totalFrames === 0) return;
      const clamped = Math.min(Math.max(0, minute), totalFrames - 1);
      setCurrentFrameIndex(clamped);
    },
    [totalFrames]
  );

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    if (totalFrames === 0) return;
    setCurrentFrameIndex((prev) => Math.min(prev + 1, totalFrames - 1));
  }, [totalFrames]);

  const stepBackward = useCallback(() => {
    setIsPlaying(false);
    if (totalFrames === 0) return;
    setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
  }, [totalFrames]);

  return {
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
  };
}
