# IdleWise Simulation Playback & Replay Specification

## 1. Simulation Computation vs. Playback Experience Separation

A foundational architectural principle of IdleWise is the strict decoupling of **simulation computation** from the **interactive playback experience**:

```
+-------------------------------------------------------------------------+
|                  SIMULATION ENGINE (Fast Computation)                   |
|  - Executes full 480-minute factory shift in < 15 milliseconds          |
|  - Evaluates physics: discrete power, energy, and transitions           |
|  - Evaluates decision intelligence at eligible idle windows             |
+------------------------------------┬------------------------------------+
                                     │ Persists atomic records
+------------------------------------▼------------------------------------+
|                      SQLITE DATABASE STORAGE                            |
|  - simulation_runs (UUID, Strategy, Metrics, Status)                    |
|  - telemetry (1,440 discrete minute records for 3 CNCs)                 |
|  - decisions (9 explainable audit events with cost/kWh calculations)   |
+------------------------------------┬------------------------------------+
                                     │ Query stored telemetry
+------------------------------------▼------------------------------------+
|                   PLAYBACK API & REPLAY CONTROLLER                      |
|  - REST: GET /api/v1/simulations/{id}/playback (480 synchronized frames)|
|  - SSE:  GET /api/v1/simulations/{id}/stream   (Server-Sent Events)     |
|  - Frontend useSimulationPlayback hook with speed scaling & scrub bar   |
+------------------------------------┬------------------------------------+
                                     │ Replay & Interactive Visualization
+------------------------------------▼------------------------------------+
|                    VIRTUAL FACTORY PLAYBACK DASHBOARD                   |
|  - Replay Clock: 08:00 to 16:00 (1x, 10x, 60x, 120x, 240x Demo Speed)   |
|  - Instantaneous fleet power (kW) and cumulative energy (kWh)           |
|  - Live machine state transitions: RUNNING -> STANDBY/OFF -> STARTING   |
|  - Chronological decision feed synced to exact evaluation minute        |
+-------------------------------------------------------------------------+
```

### Why Separation Matters
1. **Computational Speed**: Simulating an 8-hour shift does not require 8 real hours or artificial backend `sleep()` delays. The mathematical simulation executes almost instantaneously.
2. **Deterministic Source of Truth**: The playback views only what was computed and persisted in SQLite. The final frame's cumulative metrics (`energy_kwh`, `jobs_completed`, `units_produced`) equal the completed `SimulationResult` totals with 100% mathematical fidelity.
3. **Interactive Control**: Operators and judges can pause, step forward/backward, scrub to specific critical moments (e.g. 10:49 restart warmup), or accelerate playback without re-running the physics model.

---

## 2. Telemetry Replay Architecture

Each completed shift simulation contains:
$$\text{Total Telemetry Records} = 480 \text{ minutes} \times 3 \text{ machines} = 1,440 \text{ rows}$$

The playback service groups these 1,440 rows by discrete simulation minute ($t \in [0, 480)$), resolving the active machine state, instantaneous power, current job, next scheduled job, contextual note, and cumulative shift totals.

---

## 3. Playback Frame Structure

Each playback frame corresponds to a 1-minute discrete interval $[T, T+1)$:

```json
{
  "minute_index": 120,
  "simulation_time": "10:00",
  "progress_percent": 25.0,
  "machines": [
    {
      "machine_id": "CNC-01",
      "state": "OFF",
      "power_kw": 0.1,
      "active_job_id": null,
      "next_job_id": "JOB-102",
      "next_job_start": "11:00",
      "context_note": "IdleWise shutdown active"
    },
    {
      "machine_id": "CNC-02",
      "state": "RUNNING",
      "power_kw": 16.0,
      "active_job_id": "JOB-202",
      "next_job_id": "JOB-203",
      "next_job_start": "13:00",
      "context_note": "Processing JOB-202"
    },
    {
      "machine_id": "CNC-03",
      "state": "STANDBY",
      "power_kw": 0.8,
      "active_job_id": null,
      "next_job_id": "JOB-303",
      "next_job_start": "11:30",
      "context_note": "Energy-saving standby active"
    }
  ],
  "decisions": [
    {
      "timestamp": 120,
      "time_str": "10:00",
      "machine_id": "CNC-01",
      "recommended_action": "SHUTDOWN",
      "idle_window_min": 60,
      "estimated_energy_saved_kwh": 5.0167,
      "estimated_cost_saved": 40.13,
      "production_risk": "LOW",
      "reason": "Safe shutdown yields lowest energy plan."
    }
  ],
  "cumulative": {
    "energy_kwh": 38.65,
    "cost": 309.20,
    "jobs_completed": 3,
    "units_produced": 45,
    "factory_power_kw": 16.9
  }
}
```

---

## 4. Playback Timing & Speed Presets

The frontend replay controller maps playback speed presets to accurate timer tick frequencies:

| Speed Preset | UI Interval per Simulated Minute | Real Duration for 480-min Shift | Ideal Use Case |
| :--- | :--- | :--- | :--- |
| **1x** | 1,000 ms (1 sec) | 8 minutes | Detailed step inspection |
| **10x** | 300 ms | ~2.4 minutes | Thorough walk-through |
| **60x** | 100 ms | ~48 seconds | Standard presentation speed |
| **120x** | 50 ms | ~24 seconds | Fast review |
| **240x (Demo)** | 20 ms | ~9.6 seconds | Hackathon rapid demonstration |

*Note: Playback speed strictly controls display timing; it has zero impact on simulated physics, machine transitions, or energy accumulation.*

---

## 5. API Specifications

### REST Playback Endpoint
- **URL**: `GET /api/v1/simulations/{run_id}/playback`
- **Query Parameters**:
  - `start_minute` (optional): Filter frames from this minute index.
  - `end_minute` (optional): Filter frames up to this minute index.
- **Response**: `PlaybackResponse` JSON containing machine static definitions, 480 sequential frames, and `final_summary`.
- **Payload Size**: ~180 KB uncompressed (~25 KB gzipped), loaded in a single fast HTTP GET.

### SSE Streaming Endpoint
- **URL**: `GET /api/v1/simulations/{run_id}/stream?speed=240`
- **Response**: `text/event-stream` emitting:
  - `event: init`: Run metadata and frame bounds
  - `event: frame`: Instantaneous minute frame data
  - `event: decision`: Triggered decision event payload
  - `event: completed`: Final outcome summary

---

## 6. Frontend Playback Controller (`useSimulationPlayback`)

The custom React hook [`useSimulationPlayback`](../frontend/src/hooks/useSimulationPlayback.ts) encapsulates all playback state and transport operations:
- `play()` / `pause()` / `restart()`
- `seekToMinute(minute)`: Automatically pauses playback on scrub to prevent visual disorientation.
- `stepForward()` / `stepBackward()`: 1-minute discrete step adjustments for microscopic inspection of startup warmup.
- `setSpeed(speed)`: Dynamically changes tick interval without dropping frames.
- Memory leak prevention: Cleans up `setInterval` timers on component unmount, pause, or run changes.

---

## 7. Machine State Visual Language

The virtual factory dashboard uses an industrial, semantic state indicator system:
- **`RUNNING`**: Emerald green (`#10b981`) with active pulsing beacon dot.
- **`IDLE_READY`**: Amber/Yellow (`#f59e0b`) indicating equipment waiting in high-power idle ready for work.
- **`STANDBY`**: Blue (`#2563eb`) indicating low-power standby mode ($P_{\text{standby}} \approx 0.8\text{--}1.2\text{ kW}$).
- **`STARTING`**: Orange (`#f97316`) transition indicator displaying temporary warmup power spike ($P_{\text{starting}} = E_{\text{restart}} / (R/60)$).
- **`OFF`**: Slate/Dark Gray (`#334155`) indicating complete equipment safe shutdown ($P_{\text{off}} \approx 0.1\text{ kW}$).

---

## 8. Decision Synchronization

Decisions are strictly event-level entities evaluated at the start of an eligible inter-job idle window.
During playback:
1. Decisions only appear in the **Live Decision Audit Feed** when the playhead reaches their timestamp.
2. The latest triggered decision receives a visible accent badge (`Latest Trigger`).
3. Each decision card provides an expandable **"Why? / View Calculation"** drawer revealing:
   - Idle window duration ($G$)
   - Keep-Ready energy ($E_{\text{keep}}$)
   - Standby plan energy ($E_{\text{standby}}$)
   - Shutdown plan energy ($E_{\text{shutdown}}$)
   - Selected energy & net savings ($\Delta E$ in kWh and ₹)
   - Scheduled restart warmup start time
   - Production safety buffer margin

---

## 9. Demonstrating the Key Industrial Moment

During hackathon presentations, judges can observe the exact transition sequence on **CNC-01**:

- **10:00** — Job J001 completes. IdleWise evaluates a 60-minute idle gap to Job J002 at 11:00.
  - Decision appears: `SHUTDOWN` (Saving 5.02 kWh / ₹40.13).
  - CNC-01 state: `OFF` (Power drops from 12.0 kW to 0.10 kW).
- **10:50** — Scheduled warmup begins ($t_{\text{restart}} = 11:00 - 5 - 5 = 10:50$).
  - CNC-01 state: `STARTING` (Power rises to derived warmup power 4.80 kW).
- **10:55** — Warmup finishes.
  - CNC-01 state: `IDLE_READY` (Safety buffer active, machine ready at 6.0 kW).
- **11:00** — Scheduled production begins on time.
  - CNC-01 state: `RUNNING` (Processing JOB-102 at 12.0 kW).
  - Production delay: **0 minutes**.

---

## 10. Integrity: Why This is a Simulation Replay (Not Real SCADA)

1. **Deterministic Virtual Replay**: The playback is an accelerated replay of synthetic manufacturing telemetry generated by the discrete-event simulation engine.
2. **No Hardware Claim**: IdleWise does not claim real-time SCADA/PLC hardware connectivity in Prompt 4. UI labels explicitly describe the mode as **"Virtual Shift Playback"** or **"Simulated Factory Telemetry Replay"**.
3. **Identical Baseline**: Running Always Ready, Fixed Timer, and IdleWise yields the exact Prompt 3 benchmark results:
   - Always Ready: **208.9167 kWh**
   - Fixed Timer: **167.9450 kWh**
   - IdleWise: **161.6483 kWh** (22.62% energy reduction, ₹378.15 savings)
   - Units Produced: **150 / 150**
   - Late Jobs: **0**
