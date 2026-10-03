# IdleWise — Hackathon Submission Summary

**Schneider Electric Yuva Yodha Hackathon**  
**Challenge 4:** Smart Manufacturing / Industrial Energy & Process Efficiency  

---

## 1. Project Title & Tagline
- **Title:** IDLEWISE: Energy-Aware Machine Idle-State Optimization for Manufacturing SMEs
- **Tagline:** *Save energy between jobs without slowing production.*

---

## 2. Challenge & Problem Statement
In manufacturing SMEs, CNC milling centers, lathes, and automated tools frequently finish one batch and wait before the next scheduled job begins. Across a standard shift, machines spend **30% to 60% of their operational time waiting**.

During these non-productive idle intervals, equipment typically remains in a high-power `IDLE_READY` state, keeping hydraulic pumps, chillers, and spindle drives energized. Conventional solutions fall short:
- **Energy Monitoring Dashboards** only show historical waste after the shift has ended.
- **Fixed Shutdown Timers** use arbitrary time limits (e.g. 30 min) that ignore machine warmup durations, restart energy spikes, and schedule deadlines, often causing production delays.

---

## 3. The IdleWise Solution & Innovation
IdleWise is an explainable decision-support system that evaluates each inter-job idle window using machine energy profiles, restart constraints, and production schedules to recommend whether a machine should:
1. **Remain Ready** (`KEEP_READY`)
2. **Enter Low-Power Standby** (`STANDBY`)
3. **Power Down Safely** (`SHUTDOWN`)

### Key Innovations:
1. **Constraint-Aware Warmup Scheduling:** Automatically schedules equipment restart early enough ($t_{\text{restart}} = t_{\text{next}} - R - B$) to guarantee that the machine is warm and ready before the next scheduled job.
2. **Double-Counting Protection:** Explicitly models restart energy penalties ($E_{\text{restart}}$) and pre-job safety buffer energy ($P_{\text{idle}} \times B / 60$) before approving any transition.
3. **Transparent Operator Explainability:** Every recommendation generates auditable candidate state economics and plain-English rationales, building operator trust.
4. **Production Preservation Defense:** Prohibits recommendations that cause late jobs or compromise unit output.

---

## 4. Measured Impact (Configured Simulated 8-Hour Shift)

Evaluated under identical deterministic conditions (3 CNC machines, 12 production orders, 150 finished units, ₹8.00/kWh tariff):

| Operational Strategy | Total Energy | Shift Cost | Net Energy Saved | Energy Reduction | Units Produced | Late Jobs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Strategy A: Always Ready (Baseline)** | `208.92 kWh` | `₹1,671.33` | Baseline (0.00 kWh) | 0.00% | 150 / 150 | 0 |
| **Strategy B: Fixed Timer (30 min)** | `167.95 kWh` | `₹1,343.56` | 40.97 kWh | -19.61% | 150 / 150 | 0 |
| **Strategy C: IdleWise Engine** | `161.65 kWh` | `₹1,293.19` | **47.27 kWh** | **-22.62%** | 150 / 150 | 0 |

### Key Findings:
- **`22.62%` Energy Reduction:** Saves 47.27 kWh and ₹378.15 per shift.
- **`3.75%` Superior to Fixed Timer:** IdleWise uses 3.75% less energy than a conventional 30-minute timer by selecting deeper shutdown states when safe and avoiding futile cycling on short gaps.
- **`100%` Production Integrity:** All 150 units completed on time with zero job delays.

---

## 5. Technology Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons.
- **Backend:** Python 3.10+, FastAPI, Pydantic v2, SQLModel (SQLAlchemy 2.0).
- **Database:** Local SQLite (`backend/data/idlewise.db`), zero configuration.
- **Testing:** 70 backend Pytest tests, 24 frontend Vitest tests (100% passing).
- **Execution:** 1-minute discrete time-step virtual factory simulation with 480-frame playback.

---

## 6. Schneider Electric Ecosystem Fit
IdleWise is positioned as a **lightweight SME-focused decision layer** designed to complement rather than replace Schneider Electric industrial solutions:
- **Data Ingestion:** Could consume active power telemetry from Schneider Electric PM8000 / PowerLogic ION meters.
- **Machine State Feeds:** Could read machine operational status via Modbus / OPC-UA from Schneider Modicon PLCs.
- **Advisory Output:** Provides actionable idle-state guidance directly to shop-floor operators via a web dashboard or EcoStruxure integration.

---

## 7. Prototype Features
1. **Executive Overview Dashboard:** High-density summary cards, verified 22.62% savings metric, and fleet snapshot.
2. **Machine Fleet Management:** Visual power profiles (`RUNNING`, `IDLE`, `STANDBY`, `OFF`) and instantaneous idle reduction opportunities.
3. **Operational Gantt Timeline:** Run-length compressed telemetry tracks, real-time playhead, and clickable decision markers (`⚡`).
4. **Virtual Factory Shift Playback:** 480-minute scrubbable replay with speed multipliers up to 240x Demo Speed.
5. **Decision Explorer & Detail Drawer:** Complete audit trail of 9 evaluated idle windows with side-by-side candidate state energy mathematics.
6. **What-If Experimentation Sandbox:** Dynamic tuning for tariffs, timers, and machine ratings with production integrity warnings.
7. **One-Click Guided Demo Mode:** 7-step self-guided walkthrough for hackathon judges.

---

## 8. Limitations & Roadmap
- **Current Limitations:** Tested on synthetic CNC machining data with deterministic schedules and flat electricity tariffs; no physical PLC hardware connection.
- **Roadmap:** Time-of-use (TOU) dynamic electricity tariff optimization, multi-shift planning, stochastic job delay resilience, and Modbus/MQTT hardware adapters for live field pilot testing.
