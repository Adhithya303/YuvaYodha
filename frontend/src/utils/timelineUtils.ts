/**
 * Timeline utilities for compressing minute-by-minute operational telemetry
 * into continuous state segments and calculating timeline geometry.
 */

import type {
  MachineState,
  CompressedTimelineSegment,
  PlaybackFrame,
  Telemetry,
  Decision,
  PlaybackDecisionEvent,
} from '../types';

/**
 * Format a simulation minute (0-480) into standard 24-hour time HH:MM starting at shiftStart (08:00).
 */
export function minuteToShiftTime(minute: number, shiftStartHour = 8, shiftStartMin = 0): string {
  const totalMin = shiftStartHour * 60 + shiftStartMin + minute;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convert minute offset (0-480) to percentage along timeline (0% - 100%).
 */
export function minuteToTimelinePercent(minute: number, shiftTotalMinutes = 480): number {
  if (shiftTotalMinutes <= 0) return 0;
  const clamped = Math.max(0, Math.min(shiftTotalMinutes, minute));
  return (clamped / shiftTotalMinutes) * 100;
}

/**
 * Compress minute-by-minute telemetry records or playback frames for a machine into continuous segments.
 *
 * Example:
 * 50 consecutive minutes of OFF (minute 120 -> 170)
 * -> Single segment: OFF, 10:00-10:50, 50 min, avg 0.1 kW
 */
export function compressMachineTelemetry(
  records: Array<{
    minute: number;
    state: MachineState;
    power_kw: number;
    active_job_id?: string | null;
    next_job_id?: string | null;
    next_job_start?: string | null;
  }>,
  machineId: string,
  decisions: Array<Decision | PlaybackDecisionEvent> = []
): CompressedTimelineSegment[] {
  if (!records || records.length === 0) return [];

  // Sort by minute ascending
  const sorted = [...records].sort((a, b) => a.minute - b.minute);

  const segments: CompressedTimelineSegment[] = [];
  let currentSegment: {
    state: MachineState;
    startMinute: number;
    endMinute: number;
    totalPower: number;
    count: number;
    activeJobId?: string | null;
    nextJobId?: string | null;
    nextJobStart?: string | null;
  } | null = null;

  for (const r of sorted) {
    if (
      currentSegment &&
      currentSegment.state === r.state &&
      currentSegment.activeJobId === (r.active_job_id || null)
    ) {
      currentSegment.endMinute = r.minute + 1;
      currentSegment.totalPower += r.power_kw;
      currentSegment.count += 1;
      if (r.next_job_id) currentSegment.nextJobId = r.next_job_id;
      if (r.next_job_start) currentSegment.nextJobStart = r.next_job_start;
    } else {
      if (currentSegment) {
        const segStart = currentSegment.startMinute;
        const segEnd = currentSegment.endMinute;
        const matchedDecision = decisions.find(
          (d) => d.machine_id === machineId && d.timestamp >= segStart && d.timestamp <= segEnd
        );

        segments.push({
          id: `${machineId}-${segStart}-${segEnd}`,
          machineId,
          state: currentSegment.state,
          startMinute: segStart,
          endMinute: segEnd,
          durationMin: segEnd - segStart,
          startTimeStr: minuteToShiftTime(segStart),
          endTimeStr: minuteToShiftTime(segEnd),
          avgPowerKw: Number((currentSegment.totalPower / currentSegment.count).toFixed(2)),
          activeJobId: currentSegment.activeJobId,
          nextJobId: currentSegment.nextJobId,
          nextJobStart: currentSegment.nextJobStart,
          associatedDecision: matchedDecision || null,
        });
      }

      currentSegment = {
        state: r.state,
        startMinute: r.minute,
        endMinute: r.minute + 1,
        totalPower: r.power_kw,
        count: 1,
        activeJobId: r.active_job_id || null,
        nextJobId: r.next_job_id || null,
        nextJobStart: r.next_job_start || null,
      };
    }
  }

  // Push final segment
  if (currentSegment) {
    const segStart = currentSegment.startMinute;
    const segEnd = currentSegment.endMinute;
    const matchedDecision = decisions.find(
      (d) => d.machine_id === machineId && d.timestamp >= segStart && d.timestamp <= segEnd
    );

    segments.push({
      id: `${machineId}-${segStart}-${segEnd}`,
      machineId,
      state: currentSegment.state,
      startMinute: segStart,
      endMinute: segEnd,
      durationMin: segEnd - segStart,
      startTimeStr: minuteToShiftTime(segStart),
      endTimeStr: minuteToShiftTime(segEnd),
      avgPowerKw: Number((currentSegment.totalPower / currentSegment.count).toFixed(2)),
      activeJobId: currentSegment.activeJobId,
      nextJobId: currentSegment.nextJobId,
      nextJobStart: currentSegment.nextJobStart,
      associatedDecision: matchedDecision || null,
    });
  }

  return segments;
}

/**
 * Extract machine telemetry series from PlaybackFrames.
 */
export function extractMachineSeriesFromFrames(
  frames: PlaybackFrame[],
  machineId: string
) {
  return frames.map((f) => {
    const m = f.machines.find((item) => item.machine_id === machineId);
    return {
      minute: f.minute_index,
      state: m ? m.state : ('OFF' as MachineState),
      power_kw: m ? m.power_kw : 0,
      active_job_id: m?.active_job_id,
      next_job_id: m?.next_job_id,
      next_job_start: m?.next_job_start,
    };
  });
}

/**
 * Extract machine telemetry series from standard Telemetry records.
 */
export function extractMachineSeriesFromTelemetry(
  telemetry: Telemetry[],
  machineId: string
) {
  return telemetry
    .filter((t) => t.machine_id === machineId)
    .map((t) => ({
      minute: t.timestamp,
      state: t.machine_state,
      power_kw: t.power_kw,
      active_job_id: t.active_job_id,
    }));
}
