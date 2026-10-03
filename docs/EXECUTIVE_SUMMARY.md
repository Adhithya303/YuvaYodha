# IdleWise — Executive Summary

**Project:** IdleWise: Energy-Aware Machine Idle-State Optimization for Manufacturing SMEs  
**Event:** Schneider Electric Yuva Yodha Hackathon  
**Track:** Challenge 4 — Smart Manufacturing / Industrial Energy & Process Efficiency  

---

### The Problem
Small and medium manufacturing enterprises (SMEs) operate in margin-sensitive environments with rising electricity tariffs. In typical precision CNC machining and discrete manufacturing workshops, machines spend **30% to 60% of their operational shifts waiting** between scheduled production orders. During these idle intervals, machines often remain in full `IDLE_READY` mode, continuously drawing high electrical power to keep hydraulic packs, spindle drives, and chillers energized.

Blindly powering equipment off is dangerous:
- Equipment requires measurable warmup and restart time ($R$).
- Restarting draws electrical energy surge penalties ($E_{\text{restart}}$).
- Production deadlines cannot be delayed without customer penalties.

### The IdleWise Solution
**IdleWise** is a lightweight, explainable decision-support system designed specifically for manufacturing SMEs. When a machine completes a job, IdleWise evaluates the window before the next scheduled job and determines whether the machine should:
1. **Remain Ready** (`KEEP_READY`)
2. **Enter Low-Power Standby** (`STANDBY`)
3. **Power Down Safely** (`SHUTDOWN`)

Crucially, IdleWise schedules the machine to begin warming up early enough—including an explicit safety buffer ($B$)—so that the equipment is fully ready when the next production order arrives.

### The Core Result (Simulated 8-Hour Shift)
Across an identical deterministic 8-hour production shift (3 CNC machines, 12 production jobs, 150 manufactured units, ₹8.00/kWh tariff):

| Operational Strategy | Total Energy | Shift Cost | Reduction vs Baseline | Units Produced | Late Jobs |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Strategy A: Always Ready (Baseline)** | `208.92 kWh` | `₹1,671.33` | Baseline (0.0%) | 150 / 150 | 0 |
| **Strategy B: Fixed Timer (30 min)** | `167.95 kWh` | `₹1,343.56` | -19.61% | 150 / 150 | 0 |
| **Strategy C: IdleWise Engine** | `161.65 kWh` | `₹1,293.19` | **-22.62%** | 150 / 150 | 0 |

- **Net Energy Saved:** **`47.27 kWh`** per 8-hour shift (**`22.62%` reduction**).
- **Cost Reduction:** **`₹378.15`** per shift (~₹1.13 Lakhs annualized across 300 shifts).
- **Production Integrity:** **100% throughput preserved** (150/150 units, 0 delay minutes).
- **Advantage Over Fixed Timer:** IdleWise uses **`3.75% less energy`** than a conventional 30-minute timer (`6.30 kWh` additional savings) by making machine-aware shutdown decisions and avoiding futile cycling.

### Key Differentiators
1. **vs. Energy Dashboards:** Dashboards show historical consumption after energy has already been wasted. IdleWise provides proactive, actionable operational recommendations *before* the idle window begins.
2. **vs. Fixed Timer Policies:** Blind timers use an arbitrary static duration (e.g. 30 min) regardless of machine power ratings or restart costs. IdleWise calculates machine-specific economics ($E_{\text{keep}}$ vs $E_{\text{standby}}$ vs $E_{\text{shutdown}}$) and respects minimum off-time rules.
3. **Transparent Explainability:** Every decision records exact mathematical calculations and plain-English rationales, eliminating "black-box" resistance from shop-floor operators.

### Technology Stack & Architecture
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend:** Python 3.10+, FastAPI, SQLModel (SQLAlchemy 2.0 core), Pydantic v2.
- **Database:** Local SQLite (`backend/data/idlewise.db`), zero configuration required.
- **Verification:** 70 backend Pytest tests, 24 frontend Vitest tests, 100% passing.

### Current Limitations & Real-World Roadmap
- **Prototype Scope:** Validated on synthetic CNC workshop data with deterministic schedules and flat electricity tariffs.
- **Future Industrial Integration:** Designed to integrate non-invasively into the Schneider Electric ecosystem (consuming active power from Schneider PM8000/ION meters and machine states via Modbus/OPC-UA) to deliver advisory recommendations to SME operators.
