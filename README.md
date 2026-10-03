# IdleWise

**Energy-Aware Machine Idle-State Optimization for Manufacturing SMEs**  
*Schneider Electric Yuva Yodha Hackathon — Challenge 4: Smart Manufacturing / Industrial Energy & Process Efficiency*  
**Tagline:** *Save energy between jobs without slowing production.*

---

## 1. Executive Summary & Core Result

In manufacturing SMEs, CNC milling centers, lathes, and automated tools frequently finish one batch and wait before the next scheduled job begins. Across a standard shift, machines spend **30% to 60% of their operational time waiting** in high-power `IDLE_READY` mode.

**IdleWise** evaluates inter-job idle windows and determines whether equipment should remain ready, enter low-power standby, or safely shut down, scheduling warmups in advance so production is never delayed.

### Verified Benchmark Performance (Standard 8-Hour Shift)
Evaluated across an identical 8-hour shift (3 CNC machines, 12 production jobs, 150 manufactured units, ₹8.00/kWh tariff):

| Operational Strategy | Total Energy | Shift Cost | Net Energy Saved | Energy Reduction | Units Produced | Late Jobs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Strategy A: Always Ready (Baseline)** | `208.92 kWh` | `₹1,671.33` | Baseline (0.00 kWh) | 0.00% | 150 / 150 | 0 |
| **Strategy B: Fixed Timer (30 min)** | `167.95 kWh` | `₹1,343.56` | 40.97 kWh | -19.61% | 150 / 150 | 0 |
| **Strategy C: IdleWise Engine** | `161.65 kWh` | `₹1,293.19` | **47.27 kWh** | **-22.62%** | **150 / 150** | **0** |

- **`22.62%` Energy Reduction:** Saves `47.27 kWh` and `₹378.15` per shift.
- **`3.75%` Advantage Over Fixed Timer:** IdleWise uses 3.75% less energy than a conventional 30-minute timer (`6.30 kWh` saved).
- **`100%` Production Integrity:** Zero lost throughput, zero late jobs.

> **GLOBAL PROTOTYPE DISCLAIMER:**  
> *IdleWise is a software simulation and decision-support prototype using synthetic manufacturing data. It does not directly control industrial equipment.*

---

## 2. Key Features

1. **One-Click 90-Second Guided Demo:** Self-guided 7-step interactive presentation overlay for hackathon judges and plant managers.
2. **Operational Machine Gantt Timeline:** Compact visual representation with run-length telemetry compression (`compressMachineTelemetry`), real-time playhead, and clickable decision pins (`⚡`).
3. **Interactive Virtual Shift Playback:** 480-minute scrubbable replay with speed multipliers up to 240x Demo Speed.
4. **Explainable Decision Explorer & Drawer:** Audit trail of 9 evaluated idle windows with transparent side-by-side candidate state mathematics ($E_{\text{keep}}$, $E_{\text{standby}}$, $E_{\text{shutdown}}$).
5. **What-If Experimentation Sandbox:** Dynamic parameter sliders for tariffs, timer thresholds, and machine power ratings with scenario immutability and production defense alerts.
6. **Schneider Ecosystem Fit:** Lightweight decision layer designed to ingest power telemetry from Schneider PM8000 meters and Modicon PLCs via Modbus/OPC-UA.

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend:** Python 3.10+, FastAPI, Pydantic v2, SQLModel (SQLAlchemy 2.0 core)
- **Database:** Local SQLite (`backend/data/idlewise.db`), automatic zero-config schema creation
- **Testing:** Pytest (Backend: 70 tests), Vitest (Frontend: 24 tests), 100% passing

---

## 4. Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### Automated One-Click Launch (Windows)
```cmd
# Batch script:
start-demo.bat

# Or PowerShell:
.\start-demo.ps1
```

### Manual Step-by-Step Setup

#### Step 1: Start Backend API
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt

# Setup demo database and pre-generate benchmark:
python -m app.demo_setup

# Start FastAPI server:
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1 --reload
```
API Documentation will be live at: `http://127.0.0.1:8000/docs`

#### Step 2: Start Frontend Application
In a separate terminal:
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Open your browser to: `http://127.0.0.1:5173/`

---

## 5. Demo Tooling CLI

IdleWise includes convenient CLI utilities for demonstration management:

- **Pre-Demo Health Check:**
  ```bash
  cd backend
  python -m app.demo_check
  ```
  *Verifies database connectivity, machine specs, scenario registry, numerical tolerance, frames, and decisions. Outputs a clean PASS/FAIL report.*

- **Database Reset (Purges history, preserves machines/jobs):**
  ```bash
  cd backend
  python -m app.demo_reset
  ```

- **Database Setup & Re-seed:**
  ```bash
  cd backend
  python -m app.demo_setup
  ```

---

## 6. Running Tests

### Backend Test Suite (70 tests)
```bash
cd backend
python -m pytest
```
*Covers energy math exactness, finite state machine transitions, scenario feasibility, Always Ready baseline, Fixed Timer policy, IdleWise optimization, restart energy models, playback frames, SSE streaming, What-If overrides, and deterministic repeatability.*

### Frontend Test Suite (24 tests)
```bash
cd frontend
npm test -- --run
```
*Covers timeline compression, playhead scrubbing, live playback controls, candidate energy drawers, What-If comparisons, and the 7-step Guided Demo modal.*

### Production Build Validation
```bash
cd frontend
npm run build
```

---

## 7. API Route Inventory

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System health check and database status |
| `GET` | `/api/v1/machines` | List configured machine specifications |
| `GET` | `/api/v1/jobs` | List scheduled production jobs |
| `GET` | `/api/v1/simulations/scenarios` | List registered factory scenarios |
| `POST` | `/api/v1/simulations/run` | Execute single-strategy simulation |
| `POST` | `/api/v1/simulations/compare` | Execute Always Ready, Fixed Timer, and IdleWise comparison |
| `GET` | `/api/v1/simulations/{id}/telemetry` | Granular 1-minute time-series telemetry records |
| `GET` | `/api/v1/simulations/{id}/decisions` | Chronological explainable decision log |
| `GET` | `/api/v1/simulations/{id}/playback` | 480 pre-aggregated frames for virtual shift replay |
| `GET` | `/api/v1/simulations/{id}/stream` | Server-Sent Events (SSE) live frame feed |

---

## 8. Documentation Index

- [`docs/EXECUTIVE_SUMMARY.md`](docs/EXECUTIVE_SUMMARY.md): One-page executive summary for judges.
- [`docs/HACKATHON_SUBMISSION.md`](docs/HACKATHON_SUBMISSION.md): Complete Schneider Electric Yuva Yodha Challenge 4 submission narrative.
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md): 3-minute presenter walkthrough script.
- [`docs/DEMO_BACKUP.md`](docs/DEMO_BACKUP.md): Live demo recovery plans and offline contingencies.
- [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md): Comprehensive test matrix and manual decision validation.
- [`docs/ARCHITECTURE_FINAL.md`](docs/ARCHITECTURE_FINAL.md): Complete system architecture with Mermaid flowchart.
- [`docs/TECHNICAL_SUMMARY.md`](docs/TECHNICAL_SUMMARY.md): Mathematical formulations and candidate energy equations.
- [`docs/DECISION_ENGINE.md`](docs/DECISION_ENGINE.md): Algorithmic decision logic and candidate selection rules.
- [`docs/PLAYBACK.md`](docs/PLAYBACK.md): Virtual shift replay architecture and SSE streaming guide.
- [`docs/UI_UX.md`](docs/UI_UX.md): Industrial design tokens, typography, and Gantt timeline compression.
- [`docs/WHAT_IF.md`](docs/WHAT_IF.md): What-If parameter specifications and scenario immutability rules.

---

## 9. Development Status & Roadmap

- **Phase 1 (Completed):** Application foundation, SQLite DB, SQLModel entities, REST APIs.
- **Phase 2 (Completed):** Deterministic 1-minute discrete time-step virtual factory simulation.
- **Phase 3 (Completed):** Always Ready, Fixed Timer, and IdleWise decision engine with mathematical verification.
- **Phase 4 (Completed):** 480-frame playback controller, SSE streaming, live machine state cards, Recharts power curve.
- **Phase 5 (Completed):** Operational Gantt timeline, Decision Explorer, What-If Sandbox Lab, strategy comparison dashboard.
- **Phase 6 (Completed):** One-Click Guided Demo Mode, pre-demo health checks, submission documentation, final verification.

**Status:** FEATURE FROZEN & HACKATHON DEMO READY.