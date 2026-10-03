# IdleWise Architecture Plan, Risk Analysis & Assumption Audit

## 1. Contradictions Analysis in the Brief

1. **Fixed Timer Strategy vs Absolute Production Protection (Sections 9 & 11):**
   - *Conflict:* In Strategy B (Fixed Timer), if an idle window is 25 minutes and the fixed threshold is 20 minutes, the machine transitions to standby at minute 20. If restart duration is 10 minutes, the machine won't be ready until minute 30 — causing a 5-minute production delay!
   - *Resolution:* This is actually an intentional operational drawback of dumb static timers that IdleWise demonstrates. However, we must specify whether Strategy B is "unconstrained dumb timer" (demonstrating why static timers delay production or fail) or "safe fixed timer" (fixed timer with lookahead safeguard). In industrial literature, dumb fixed timers frequently cause line stoppages when operators aren't careful. We should let Strategy B demonstrate its vulnerability or implement it with clear documented behavior.

2. **Immediate Standby vs Gradual Transition in IdleWise:**
   - *Analysis:* Does IdleWise put the machine into STANDBY immediately when a job finishes (if the upcoming gap is large enough), or does it wait for an idle threshold?
   - *Clarification:* IdleWise knows the schedule in advance. Therefore, to maximize energy savings during a known 60-minute gap, IdleWise should transition to STANDBY immediately upon job completion (plus any cool-down), rather than wasting 20 minutes in IDLE_READY.

3. **Shutdown vs Standby Thresholds:**
   - *Analysis:* Section 10 mentions evaluating shutdown only for substantially longer idle windows when `shutdown_allowed` is true.
   - *Clarification:* Shutting down incurs `minimum_off_time_min` plus longer restart times/energies. We must define explicit shutdown mathematical conditions: $G > R_{\text{off}} + B + \text{min\_off\_time}$ and $E_{\text{off\_total}} < E_{\text{standby\_total}}$.

---

## 2. Technical Risks & Missing Assumptions

| Risk / Gap | Impact | Mitigation / Defined Assumption |
| :--- | :--- | :--- |
| **Restart timing trigger** | When should a machine in STANDBY start warming up? | Machine must trigger `STARTING` exactly at `scheduled_start - restart_duration_min - safety_buffer_min` so it transitions to `IDLE_READY` at or before `scheduled_start`. |
| **Restart power & energy modeling** | How is power consumed during the `STARTING` state? | Instantaneous power during warmup $= \frac{\text{restart\_energy\_kwh}}{\text{restart\_duration\_min} / 60}$ kW. This ensures accurate minute-by-minute energy tracking. |
| **Shift Boundary Jobs** | Jobs scheduled right at minute 0 or crossing minute 480. | Shift window is $t \in [0, 480]$. Initial machine state at $t=0$: if job starts at $t=0$, machine is already `IDLE_READY` or `RUNNING`. Final energy calculation accounts for jobs in progress or clamps at shift end. |
| **Simulated vs Wall-Clock Speed** | Shift simulation speed & interactive playback. | Backend can compute the entire 480-minute run in <50ms, returning the full timeseries array for instant comparison, or stream/step through at configurable rates (1x, 10x, 50x, 100x). |
| **Deterministic Workload Seed** | Repeatability across the 3 strategies. | Fixed benchmark scenario dataset (3 machines, 15 jobs, 2 product types) with predefined start times, ensuring 100% fair baseline comparison. |
| **Electricity Tariff Structure** | Currency and cost calculation. | Configurable flat rate (default: $0.15 / kWh) or peak/off-peak tariff for the What-If analysis. |
| **Carbon Emissions Factor** | $\text{CO}_2\text{e}$ calculation. | Standard grid average assumption: e.g. $0.40\,\text{kg CO}_2\text{e} / \text{kWh}$ (configurable). |

---

## 3. High-Level Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      FRONTEND                          │
                    │   React 18 + Vite + Tailwind CSS + shadcn/ui + Lucide  │
                    │   Recharts (Power Curves & Cumulative Energy)          │
                    │   Timeline Gantt View (Machine Operational States)     │
                    │   What-If Interactive Parameter Sandbox                │
                    └──────────────────────────▲─────────────────────────────┘
                                               │ REST API / JSON
                    ┌──────────────────────────▼─────────────────────────────┐
                    │                   BACKEND (FastAPI)                    │
                    │  ┌──────────────────────────┐ ┌─────────────────────┐  │
                    │  │   Simulation Engine      │ │  IdleWise Decision  │  │
                    │  │   (Deterministic 1-min)  │ │  Rule Engine & Math │  │
                    │  └───────────┬──────────────┘ └──────────┬──────────┘  │
                    │              │                           │             │
                    │  ┌───────────▼───────────────────────────▼──────────┐  │
                    │  │            Repository / Data Access              │  │
                    │  │            (SQLModel & SQLite Engine)            │  │
                    │  └──────────────────────────┬───────────────────────┘  │
                    └─────────────────────────────┼──────────────────────────┘
                                                  ▼
                                     ┌─────────────────────────┐
                                     │     SQLite Database     │
                                     │  (machines, jobs, runs, │
                                     │   telemetry, decisions) │
                                     └─────────────────────────┘
```

---

## 4. Machine State Transition Graph

```
           ┌──────────┐
           │   OFF    │
           └────┬─────┘
                │ trigger: warmup before job
                ▼
   ┌──────────────────────────┐
   │         STARTING         │
   └────────────┬─────────────┘
                │ warmup finished
                ▼
   ┌──────────────────────────┐      job starts      ┌──────────┐
   │        IDLE_READY        ├─────────────────────►│ RUNNING  │
   └──────▲────────────┬──────┘◄─────────────────────┤          │
          │            │             job ends        └──────────┘
          │            │
          │            │ decision: STANDBY
          │            ▼
   ┌──────┴───────────────────┐
   │         STANDBY          │
   └──────────────────────────┘
```

---

## 5. Synthetic Factory Dataset (Default 8-Hour Shift)

- **Machine 1 (CNC Milling Center):**
  - Run: 22 kW | Idle: 6.5 kW | Standby: 1.2 kW | Off: 0.1 kW
  - Restart: 8 min, 1.8 kWh. Safety buffer: 4 min. Standby: Yes, Shutdown: No.
- **Machine 2 (Injection Molding Unit):**
  - Run: 38 kW | Idle: 11.0 kW | Standby: 2.5 kW | Off: 0.2 kW
  - Restart: 15 min, 4.2 kWh. Safety buffer: 5 min. Standby: Yes, Shutdown: Yes.
- **Machine 3 (Industrial Laser Cutter):**
  - Run: 16 kW | Idle: 4.8 kW | Standby: 0.8 kW | Off: 0.05 kW
  - Restart: 5 min, 0.9 kWh. Safety buffer: 3 min. Standby: Yes, Shutdown: No.

- **Jobs Workload:**
  - 15 production jobs across Product A (Precision Enclosure) and Product B (Structural Bracket).
  - Includes short gaps (3–10 min: keep ready), medium gaps (25–50 min: ideal standby), and long gaps (90–120 min: shutdown candidates).

---

## 6. Project Directory Layout

```
yuvayodha/
├── docs/
│   ├── PROJECT_CONTEXT.md
│   └── ARCHITECTURE_AND_RISK_ANALYSIS.md
├── backend/
│   ├── app/
│   │   ├── api/routes.py
│   │   ├── core/config.py
│   │   ├── engine/
│   │   │   ├── simulator.py
│   │   │   ├── decision.py
│   │   │   └── strategies.py
│   │   ├── models/
│   │   │   ├── machine.py
│   │   │   ├── job.py
│   │   │   ├── simulation.py
│   │   │   └── decision.py
│   │   ├── db/database.py
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   ├── overview/
    │   │   ├── machines/
    │   │   ├── timeline/
    │   │   ├── decisions/
    │   │   └── compare/
    │   ├── hooks/
    │   ├── lib/
    │   ├── types/
    │   └── App.tsx
    ├── package.json
    └── tailwind.config.js
```
