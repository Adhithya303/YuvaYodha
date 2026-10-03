# IdleWise — Technical Summary & Specification

**Schneider Electric Yuva Yodha Hackathon — Challenge 4**  
**Project:** IdleWise: Energy-Aware Machine Idle-State Optimization  

---

## 1. Mathematical Formulation

### 1.1 Discrete-Time Energy Accumulation
The factory simulator evaluates machine state progression over an 8-hour shift in discrete $\Delta t = 1 \text{ minute}$ time-steps ($t \in [0, 479]$).

At each minute $t$, machine $m$ in operational state $S \in \{\text{RUNNING}, \text{IDLE\_READY}, \text{STANDBY}, \text{STARTING}, \text{OFF}\}$ draws active electrical power $P(m, S) \text{ kW}$.

Energy consumed during each step is accumulated with floating-point precision:
$$E_{\text{step}}(m, t) = P(m, S) \times \left(\frac{1}{60}\right) \text{ kWh}$$

Total shift energy across all $M$ machines and $T = 480$ minutes:
$$E_{\text{shift}} = \sum_{m=1}^{M} \sum_{t=0}^{T-1} E_{\text{step}}(m, t) \text{ kWh}$$

### 1.2 Inter-Job Idle Window Detection
When machine $m$ completes job $j_k$ at minute $t_{\text{end}}$, the engine searches the schedule for the next job $j_{k+1}$ assigned to $m$.
- Gap duration: $G = t_{\text{start}}(j_{k+1}) - t_{\text{end}}(j_k)$
- Warmup duration: $R_m \text{ minutes}$
- Safety buffer: $B_m \text{ minutes}$

Feasibility condition for energy transition:
$$G > R_m + B_m$$
If $G \le R_m + B_m$, the machine remains in `IDLE_READY` (`RESTART_MARGIN_INSUFFICIENT`).

### 1.3 Candidate State Energy Models

#### 1. Keep-Ready Baseline Candidate
$$E_{\text{keep}} = P_{\text{idle}} \times \left(\frac{G}{60}\right) \text{ kWh}$$

#### 2. Standby Candidate
Safe standby duration: $\Delta t_{\text{standby}} = G - R_m - B_m$.
$$E_{\text{standby}} = \left(P_{\text{standby}} \times \frac{\Delta t_{\text{standby}}}{60}\right) + E_{\text{restart}} + \left(P_{\text{idle}} \times \frac{B_m}{60}\right) \text{ kWh}$$

#### 3. Shutdown Candidate
Feasible when `shutdown_allowed == True` and $(G - R_m - B_m) \ge \text{minimum\_off\_time\_min}$.
Safe off duration: $\Delta t_{\text{off}} = G - R_m - B_m$.
$$E_{\text{shutdown}} = \left(P_{\text{off}} \times \frac{\Delta t_{\text{off}}}{60}\right) + E_{\text{restart}} + \left(P_{\text{idle}} \times \frac{B_m}{60}\right) \text{ kWh}$$

### 1.4 Warmup Restart Energy Representation
To eliminate double-counting, equivalent average electrical power during the $R_m$ warmup minutes is derived:
$$P_{\text{starting}} = \frac{E_{\text{restart}}}{\left(\frac{R_m}{60}\right)} \text{ kW}$$
During discrete simulation, $P_{\text{starting}} \times \frac{R_m}{60} = E_{\text{restart}}$ exactly.

### 1.5 Scheduled Restart Enforcement
To ensure zero production delays, machine state transitions are scheduled backward from the next job's start time $t_{\text{next}}$:
$$\text{Warmup Begins:} \quad t_{\text{restart}} = t_{\text{next}} - R_m - B_m$$
$$\text{Ready State (Buffer):} \quad t_{\text{ready}} = t_{\text{next}} - B_m$$
$$\text{Production Start:} \quad t_{\text{next}}$$

---

## 2. Strategy Specifications

1. **Strategy A (Always Ready):** Continuous `IDLE_READY` between production jobs. Zero transitions. Serves as scientific baseline.
2. **Strategy B (Fixed Timer):** If gap $G > 30 \text{ minutes}$ and $G > R_m + B_m$, machine transitions to `STANDBY`. Blind to power ratings and restart penalties.
3. **Strategy C (IdleWise Engine):** Evaluates all candidates, enforces minimum savings threshold ($\Delta E \ge 0.10 \text{ kWh}$), checks minimum off-time rules, and selects the lowest-energy feasible state.

---

## 3. Database Schema & Architecture

Implemented in SQLite (`backend/data/idlewise.db`) via SQLModel (SQLAlchemy 2.0 core):

| Entity | Table Name | Purpose | Key Columns |
| :--- | :--- | :--- | :--- |
| **Machine** | `machines` | Machine specifications | `id`, `name`, `run_power_kw`, `idle_power_kw`, `standby_power_kw`, `restart_duration_min`, `restart_energy_kwh`, `safety_buffer_min` |
| **Job** | `jobs` | Production orders | `id`, `machine_id`, `scheduled_start`, `duration_min`, `deadline`, `quantity`, `status` |
| **SimulationRun** | `simulation_runs` | Run execution logs | `id`, `strategy`, `status`, `total_energy_kwh`, `total_cost`, `jobs_completed`, `late_jobs` |
| **Telemetry** | `telemetry` | Time-series data (1,440 rows/run) | `id`, `timestamp`, `machine_id`, `machine_state`, `power_kw`, `simulation_run_id` |
| **Decision** | `decisions` | Explainable decision log | `id`, `timestamp`, `machine_id`, `recommended_action`, `idle_window_min`, `estimated_energy_saved_kwh`, `estimated_cost_saved`, `reason` |

---

## 4. API Endpoints

- `GET /api/v1/health`: System health & SQLite connectivity.
- `GET /api/v1/machines`: List configured machine hardware specifications.
- `GET /api/v1/jobs`: List scheduled production jobs.
- `GET /api/v1/simulations/scenarios`: List available simulation scenarios.
- `POST /api/v1/simulations/run`: Execute and persist a single-strategy simulation.
- `POST /api/v1/simulations/compare`: Execute Always Ready, Fixed Timer, and IdleWise side-by-side.
- `GET /api/v1/simulations/{id}/telemetry`: Query granular time-step records.
- `GET /api/v1/simulations/{id}/decisions`: Query explainable decision records.
- `GET /api/v1/simulations/{id}/playback`: Query 480 pre-aggregated playback frames.
- `GET /api/v1/simulations/{id}/stream`: Server-Sent Events (SSE) live frame stream.

---

## 5. Scenario Immutability & What-If Sandbox

When operators test What-If assumptions in the sandbox:
1. The backend deep-copies the scenario: `cloned = base_scenario.model_copy(deep=True)`.
2. Parameter overrides (electricity tariff, machine ratings) are applied strictly to `cloned`.
3. The registered scenario `SCENARIO_REGISTRY["default_shift"]` is never modified.
4. If an override induces late jobs or reduces unit output, the frontend flags a prominent production defense warning banner.
