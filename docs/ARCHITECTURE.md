# IdleWise Architecture Specification

## 1. System Architecture Diagram

```
+--------------------------------------------------------------------------+
|                                FRONTEND                                  |
|  - React 19 + TypeScript + Vite                                          |
|  - Tailwind CSS + industrial layout components + Lucide Icons            |
|  - Overview, Machines, and Simulation Views (Prompt 1 & 2)               |
|  - Gantt-style Operational Timeline (Prompt 5)                           |
|  - Recharts for power curves & energy comparison (Prompt 5)              |
|  - What-If Interactive Parameter Sandbox (Prompt 5)                      |
+------------------------------------▲-------------------------------------+
                                     │ HTTP REST API (JSON)
+------------------------------------▼-------------------------------------+
|                          BACKEND (FastAPI API V1)                        |
|  - /api/v1/health       - Health & DB status diagnostics                 |
|  - /api/v1/machines     - Machine configuration & constraints            |
|  - /api/v1/jobs         - Production schedule & job queues               |
|  - /api/v1/simulations  - Multi-strategy execution & telemetry (Prompt 2)|
|  - /api/v1/decisions    - Explainable recommendation logs (Prompt 3 / 4) |
+------------------------------------┬-------------------------------------+
                                     │
+------------------------------------▼-------------------------------------+
|                            APPLICATION CORE                              |
|                                                                          |
|  [SIMULATION ENGINE]              [DECISION & OPTIMIZATION ENGINE]       |
|  Status: IMPLEMENTED (Prompt 2)   Status: IMPLEMENTED (Prompt 3)         |
|  - 1-minute discrete time-step    - Inter-job gap evaluation ($G > R+B)  |
|  - Machine state transitions      - Net energy savings calculation       |
|  - Accurate energy accumulation   - Standby & Shutdown scheduling        |
|  - Telemetry generation           - Safety buffer warmup enforcement     |
|  - Strategy A: Always Ready       - Explainable rationale generator      |
|  - Strategy B: Fixed Timer        - Strategy B: Fixed Timer              |
|  - Strategy C: IdleWise           - Strategy C: IdleWise                 |

+------------------------------------┬-------------------------------------+
                                     │
+------------------------------------▼-------------------------------------+
|                         DATA ACCESS (SQLModel)                           |
|  - Machines, Jobs, Telemetry, Decisions, SimulationRuns                  |
+------------------------------------┬-------------------------------------+
                                     │
+------------------------------------▼-------------------------------------+
|                           SQLITE DATABASE                                |
|  - File: backend/data/idlewise.db (Auto-created, zero config)            |
+--------------------------------------------------------------------------+
```

---

## 2. Core Modules and Implementation Status

### Module 1: API Foundation & Models (PROMPT 1 — COMPLETED)
- **FastAPI application shell** with lifespan auto-initialization of SQLite schema.
- **SQLModel entities** with strict validation on power, duration, safety margins, and machine constraints.
- **REST Endpoints:** `/health`, `/machines`, `/machines/{id}`, `/jobs`.
- **Database:** Automatic zero-config SQLite initialization at `backend/data/idlewise.db`.
- **Seeding:** Explicit command `python -m app.seed` with 3 synthetic machines and 6 test jobs.

### Module 2: Factory Simulation Engine (PROMPT 2 — COMPLETED)
- *Status:* **IMPLEMENTED — Prompt 2**
- **Discrete 1-minute time-step simulator** (`SimulationEngine` in `app.services.simulation.engine`).
- **Operational State Machine** enforcing legal transitions (`RUNNING` <-> `IDLE_READY`, `STANDBY`, `STARTING`, `OFF`).
- **Mathematical Energy Accumulation:** $E = P \times \frac{1}{60} \text{ kWh}$ per step, float precision.
- **Always Ready Baseline:** Continuous `IDLE_READY` during idle intervals.
- **Deterministic Workload:** Standard 8-hour shift (480 min), 3 CNC machines, 12 production jobs.
- **Simulation APIs:** `/api/v1/simulations/scenarios`, `/api/v1/simulations/run`, `/api/v1/simulations`, `/api/v1/simulations/{id}`, `/api/v1/simulations/{id}/telemetry`.
- **Database Persistence:** Automatically persists `SimulationRun` and `1440` granular `Telemetry` rows per 480-minute run.

### Module 3: IdleWise Decision Engine (PROMPT 3 — COMPLETED)
- *Status:* **IMPLEMENTED — Prompt 3**
- Evaluates inter-job idle gap $G$, restart warmup $R$, and safety buffer $B$.
- Computes keep-ready energy $E_{\text{keep}}$ vs standby energy $E_{\text{standby}}$ and shutdown energy $E_{\text{shutdown}}$.
- Recommends optimal state: `KEEP_READY`, `STANDBY`, or `SHUTDOWN`.
- Guarantees zero intentional job delays: schedules warmup at $t_{\text{next}} - R - B$.
- Generates transparent, human-readable explanations with quantified energy and cost metrics.
- Strategy B (`FIXED_TIMER`) and Strategy C (`IDLEWISE`) fully executable and verified.
- Multi-strategy comparison endpoint `POST /api/v1/simulations/compare` and decision audit endpoint `GET /api/v1/simulations/{id}/decisions`.

### Module 4: Live & Playback Simulation APIs (PROMPT 4 — COMPLETED)
- *Status:* **IMPLEMENTED — Prompt 4**
- **Virtual Shift Playback Controller** with speed multipliers (1x, 10x, 60x, 120x, 240x Demo Speed) and scrub bar.
- **Synchronized REST Telemetry Replay:** `GET /api/v1/simulations/{id}/playback` serving 480 discrete 1-minute frames.
- **Server-Sent Events (SSE) Stream:** `GET /api/v1/simulations/{id}/stream` for real-time live demonstrations.
- **Live Fleet State Cards:** Real-time visualization of machine states (`RUNNING`, `STANDBY`, `STARTING`, `OFF`, `IDLE_READY`).
- **Synchronized Decision Audit Feed:** Live chronological appearance of IdleWise decisions with expandable explainability calculations.
- **Live Power Curve:** Progressive electrical demand tracking vs shift timeline via Recharts.

### Module 5: Comprehensive Industrial UI & Operational Timeline (PROMPT 5 — COMPLETED)
- *Status:* **IMPLEMENTED — Prompt 5**
- **Operational Machine Gantt Timeline:** Compact visual representation of 480-minute shift with run-length compressed telemetry segments (`compressMachineTelemetry`), synchronized real-time playhead (`TimelinePlayhead.tsx`), and clickable decision event markers (`DecisionMarker.tsx`).
- **Explainable Decision Explorer & Drawer:** Chronological decision explorer (`DecisionExplorer.tsx`) with summary KPIs, machine/action filters, and slide-over audit drawer (`DecisionDetailDrawer.tsx`) displaying mathematical candidate energy evaluation ($E_{\text{keep}}$, $E_{\text{standby}}$, $E_{\text{shutdown}}$), restart scheduling calculations, and safety buffer verification.
- **Multi-Strategy Comparison Dashboard:** Stacked bar chart of energy composition by operational state (`EnergyCompositionChart.tsx`), shift energy comparison (`ComparisonChart.tsx`), and comprehensive 12-metric evaluation table (`StrategyComparisonTable.tsx`).
- **What-If Experimentation Sandbox:** Dynamic parameter tuning (`WhatIfPanel.tsx`) for electricity tariffs, fixed timer thresholds, and machine standby/idle ratings with backend scenario cloning (`create_overridden_scenario`), side-by-side delta analysis (`WhatIfComparison.tsx`), and strict production defense warnings.
- **Polished Industrial Pages:** Modern Schneider EcoStruxure-inspired UX across Executive Overview (`OverviewPage.tsx`), Machine Fleet Management (`MachinesPage.tsx`), Shift Simulation & Playback (`SimulationPage.tsx`), and Decision/What-If Insights (`InsightsPage.tsx`).

### Module 6: Demo Mode, Tooling & Verification (COMPLETED)
- *Status:* **IMPLEMENTED**
- Pre-packaged industrial test scenarios, performance benchmarks, 7-step judge presentation mode, automated CLI setup/checks, and submission packaging.
