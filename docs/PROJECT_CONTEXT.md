# PROJECT: IDLEWISE

SCHNEIDER ELECTRIC HACKATHON — CHALLENGE 4  
SMART MANUFACTURING / INDUSTRIAL ENERGY & PROCESS EFFICIENCY

---

## 1. PROJECT PURPOSE

We are building a hackathon software prototype called **IdleWise**.

IdleWise is an energy-aware machine idle-state decision system designed primarily for small and medium-sized manufacturing facilities.

The project addresses one narrow operational problem:
Manufacturing machines frequently finish one production job and then wait before the next scheduled job begins.
During this waiting period the machine may continue consuming substantial electrical power even though it is not producing anything.

However, simply switching the machine off is not always safe or operationally desirable because:
- the next job may begin soon;
- the machine may require time to restart;
- restarting may consume additional energy;
- the machine may have minimum off-time constraints;
- repeated starts may be undesirable;
- an early-arriving production job could be delayed;
- production deadlines must remain protected.

IdleWise determines whether a machine should:
1. remain `IDLE_READY`;
2. enter `STANDBY`;
3. enter `OFF` state where explicitly allowed;

and determines when it needs to restart so that it is ready for its next production job.

The main objective is:
**REDUCE ENERGY CONSUMPTION DURING NON-PRODUCTIVE MACHINE IDLE WINDOWS**  
**WITHOUT:**
- reducing production throughput;
- intentionally delaying production jobs;
- violating machine restart constraints;
- pretending to control real industrial equipment.

---

## 2. IMPORTANT POSITIONING

IdleWise is **NOT**:
- a generic energy dashboard;
- a complete MES;
- a predictive maintenance platform;
- an industrial SCADA system;
- a PLC controller;
- a replacement for Schneider Electric EcoStruxure;
- a real industrial machine controller;
- a full digital twin.

IdleWise is a **DECISION-SUPPORT AND SIMULATION LAYER**.

Its core contribution is converting:
```
machine energy characteristics
+
production schedule
+
idle duration
+
restart constraints
--------------------------------
= AN EXPLAINABLE OPERATING RECOMMENDATION
```

---

## 3. TARGET USER

- **Primary user:** Manufacturing SME production/energy manager.
- **Secondary users:** Plant manager, production planner, energy manager, operations supervisor.

---

## 4. INITIAL FACTORY SCOPE

The MVP simulates a small manufacturing workshop:
- Approximately 3 machines;
- 2 product types;
- One 8-hour shift (480 minutes);
- Approximately 10–20 jobs.
- Configurable so more machines can be added later.
- Realistic but SYNTHETIC machine parameters (clearly documented as assumptions, not claiming real Schneider Electric equipment specs).

---

## 5. MACHINE STATES

1. `RUNNING`: Machine is actively processing a production job.
2. `IDLE_READY`: Machine is not producing but remains fully ready and consumes idle power.
3. `STANDBY`: Machine uses lower power but requires restart/warmup time before the next job.
4. `STARTING`: Machine is transitioning from standby/off to ready state.
5. `OFF`: Machine consumes minimum/zero modeled power but may have longer restart restrictions.

---

## 6. MACHINE CONFIGURATION

Configurable fields per machine:
- `id` (string)
- `name` (string)
- `machine_type` (string)
- `run_power_kw` (float)
- `idle_power_kw` (float)
- `standby_power_kw` (float)
- `off_power_kw` (float)
- `restart_duration_min` (int)
- `restart_energy_kwh` (float)
- `standby_allowed` (bool)
- `shutdown_allowed` (bool)
- `minimum_off_time_min` (int)
- `safety_buffer_min` (int)
- *Optional future fields:* `maximum_restarts_per_shift`, `restart_cost`, `wear_penalty`.

---

## 7. JOB MODEL

- `id` (string)
- `job_name` (string)
- `product_type` (string)
- `machine_id` (string)
- `scheduled_start` (int, simulation minute)
- `duration_min` (int)
- `deadline` (int, simulation minute)
- `status`: `QUEUED`, `ACTIVE`, `COMPLETED`, `DELAYED`

---

## 8. SIMULATION

- Deterministic factory simulation.
- Resolution: 1 simulated minute per step.
- Fast execution for full shift (480 mins) + optional accelerated playback in UI.
- Tracking:
  - Simulation clock;
  - Machine state;
  - Active job;
  - Next job;
  - Instantaneous machine power (kW);
  - Cumulative energy consumption (kWh);
  - Completed jobs;
  - Delayed jobs;
  - Machine state transitions;
  - IdleWise decisions.
- Deterministic random seeds whenever randomness is introduced.

---

## 9. BASELINE STRATEGIES

1. **STRATEGY A — ALWAYS READY**: Machine stays `IDLE_READY` until next job begins (baseline).
2. **STRATEGY B — FIXED TIMER**: Enters standby when idle exceeds a fixed threshold (e.g. idle > 20 min).
3. **STRATEGY C — IDLEWISE**: Evaluates schedule, idle duration, power deltas, restart duration, energy penalty, and safety buffer.

---

## 10. CORE DECISION LOGIC

Deterministic & explainable:
- For idle gap $G$:
  - Restart duration $= R$
  - Safety buffer $= B$
  - Available standby window $= G - (R + B)$
  - If $G \le R + B \implies$ `KEEP IDLE_READY`.
  - Energy standby: $E_{\text{standby}} = P_{\text{standby}} \times \frac{G - R - B}{60} + E_{\text{restart}} + P_{\text{idle}} \times \frac{B}{60}$ (accounting for restart warmup phase and pre-job safety buffer)
  - Net Saving: $\Delta E = E_{\text{keep}} - E_{\text{standby}}$
  - If `standby_allowed` AND safe restart margin exists AND $\Delta E > \text{threshold} \implies$ `STANDBY`.
  - Shutdown evaluated similarly for longer windows if `shutdown_allowed` is true: $E_{\text{shutdown}} = P_{\text{off}} \times \frac{G - R - B}{60} + E_{\text{restart}} + P_{\text{idle}} \times \frac{B}{60}$.

---

## 11. ABSOLUTE PRODUCTION CONSTRAINT

**The machine must be ready for its next required job.**
Energy reduction must never compromise throughput or cause intentional delays.
Metrics: jobs completed, late jobs, job delay minutes.

---

## 12. EXPLAINABILITY

Every recommendation must include a transparent rationale:
- Machine ID & target state
- Next job timing & gap duration
- Restart duration & safety buffer
- Available safe standby window
- $E_{\text{keep}}$, $E_{\text{standby}}$, and estimated savings $\Delta E$
- Production risk rating & explicit textual reason.

---

## 13. KPIS

- Total energy (kWh)
- Energy saved (kWh) & % reduction
- Jobs completed, late jobs, total delay minutes
- Energy per unit (kWh/unit)
- Estimated energy cost & cost saved ($ or local currency)
- Optional: Estimated $\text{CO}_2\text{e}$ (with configurable emissions factor).

---

## 14. EXPERIMENT STRUCTURE

Identical workload run across:
1. Always Ready
2. Fixed Timer
3. IdleWise
Compare side-by-side with zero confounding variation.

---

## 15. DATABASE

- SQLite (MVP) using SQLModel/SQLAlchemy.
- Entities: `machines`, `jobs`, `telemetry`, `decisions`, `simulation_runs`.

---

## 16. TECH STACK

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Python, FastAPI, Pydantic, SQLModel
- **Simulation:** Python (deterministic step engine)
- **Database:** SQLite
- **Testing:** Pytest, Vitest

---

## 17. FRONTEND PRINCIPLES & SCREENS

- Industrial aesthetic: high clarity, clean, restrained palette, no neon/cyberpunk, no excessive gradients or decorative gauges.
- Reference: Schneider Electric EcoStruxure Power Monitoring Expert, MachineMetrics, Tulip.
- Screens:
  1. **Overview**: Key KPIs, live machine summary, energy reduction.
  2. **Machines**: Detailed machine cards, live state, power, job queue, recommendation.
  3. **Timeline**: Visual Gantt/state transitions over shift.
  4. **Decisions**: Audit log of recommendations with "Why" drill-down drawer/modal.
  5. **Compare / What-If**: Side-by-side strategy comparison with interactive parameter sliders.
