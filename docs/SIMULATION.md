# IdleWise Factory Simulation Engine Documentation

**Phase:** Prompt 2 of 6  
**Module:** Discrete Time-Step Factory Simulation & Operational State Engine  
**Challenge:** Schneider Electric Hackathon — Challenge 4

---

## 1. Overview & Simulation Philosophy

The IdleWise Simulation Engine simulates a virtual manufacturing workshop operating across standard production shifts. It is built upon:
- **Discrete 1-minute time-steps:** The simulation advances time in 1-minute intervals $[T, T+1)$ where $T \in [0, \text{shift\_minutes})$.
- **Deterministic state progression:** No stochastic noise or uncontrolled random variables. Identical scenario inputs yield bit-for-bit identical energy and operational metrics.
- **Scientific integrity:** In Prompt 2, only the **ALWAYS_READY** baseline strategy is executable. This establishes the unoptimized ground-truth energy consumption against which energy-saving strategies (Fixed Timer and IdleWise) will be evaluated in subsequent prompts.

---

## 2. Time-Step Convention

Each step represents a 1-minute interval $[T, T+1)$:
1. **Clock advancement:** $T = 0, 1, 2, \dots, 479$ for a 480-minute shift (08:00 to 16:00).
2. **Job triggering at $T$:** If a scheduled job has `scheduled_start == T`, the machine begins executing and transitions to `RUNNING`.
3. **State determination for $[T, T+1)$:** Strategy evaluates conditions and specifies operational state (`RUNNING` or `IDLE_READY` under Always Ready).
4. **Instantaneous power lookup:** Power rating in kW is retrieved from machine configuration.
5. **Energy accumulation:** Electrical energy is computed as $E_{\text{step}} = P_{\text{kw}} \times \frac{1}{60} \text{ kWh}$.
6. **Telemetry emission:** One telemetry record is recorded per machine per minute.
7. **Job duration countdown:** Active job remaining minutes are decremented. If remaining duration reaches 0, the job completes at $T+1$.

---

## 3. Operational State Machine

Machines can occupy one of five discrete states:
1. `RUNNING`: Actively processing a production job.
2. `IDLE_READY`: Powered on, waiting for production, consuming idle ready power.
3. `STANDBY`: Low-power standby state (reserved for Prompt 3+).
4. `STARTING`: Warmup transition phase to reach ready state (reserved for Prompt 3+).
5. `OFF`: Complete power shutdown (reserved for Prompt 3+).

### Legal Transitions
```
IDLE_READY <───> RUNNING       (Production cycle)
IDLE_READY ────> STANDBY       (Standby cycle — Prompt 3)
STANDBY    ────> STARTING      (Warmup cycle — Prompt 3)
STARTING   ────> IDLE_READY    (Ready cycle — Prompt 3)
IDLE_READY ────> OFF           (Shutdown cycle — Prompt 3)
OFF        ────> STARTING      (Startup cycle — Prompt 3)
```

### Prohibited / Dangerous Transitions
- `RUNNING -> OFF`: Prohibited to prevent emergency shutoff and tooling damage during cutting.
- `OFF -> RUNNING`: Prohibited; machine must complete warmup through `STARTING` and `IDLE_READY`.
- `STANDBY -> RUNNING`: Prohibited; machine must warm up first.
- `RUNNING -> STANDBY`: Prohibited during active machining.

---

## 4. Energy & Cost Mathematics

All calculations use double-precision IEEE floating-point arithmetic without premature rounding.

### A. Step Energy
$$E_{\text{step}} = P_{\text{kw}} \times \left(\frac{1}{60}\right)\text{ kWh}$$

### B. Machine Total Energy
$$E_{\text{machine}} = \sum_{t=0}^{\text{shift}-1} E_{\text{step}}(t)$$

### C. Factory Total Energy
$$E_{\text{factory}} = \sum_{m \in \text{machines}} E_{\text{machine}}(m)$$

### D. Total Electricity Cost
$$\text{Cost} = E_{\text{factory}} \times \text{Tariff} \quad (\text{Default flat tariff: } ₹8.00 / \text{kWh})$$

### E. Energy Per Produced Unit
$$\text{EnergyPerUnit} = \frac{E_{\text{factory}}}{\sum \text{quantity of completed jobs}}$$

---

## 5. Strategy A — Always Ready Baseline

- **Rule:** If machine has an active job $\implies$ `RUNNING`. Else $\implies$ `IDLE_READY`.
- Under Always Ready, machines never enter `STANDBY`, `STARTING`, or `OFF`.
- Machine state durations over the shift satisfy:
  $$\text{Running Minutes} + \text{Idle Ready Minutes} = \text{Shift Minutes (480 min)}$$

---

## 6. Default Demonstration Scenario (`default_shift`)

- **Shift Window:** 08:00 to 16:00 (480 minutes)
- **Equipment:** 3 Synthetic CNC Machining Centers
  - `CNC-01`: Run 12 kW, Idle 6 kW (Restart: 5 min, 0.4 kWh)
  - `CNC-02`: Run 16 kW, Idle 8 kW (Restart: 7 min, 0.6 kWh)
  - `CNC-03`: Run 10 kW, Idle 4.5 kW (Restart: 4 min, 0.3 kWh)
- **Workload:** 12 Scheduled Jobs producing 150 units across Product A and Product B.
- **Idle Gap Profile:** Includes short idle gaps (10–30 min), medium idle gaps (35–60 min), and extended idle gaps (70–135 min).

### Exact Baseline Results (Always Ready)
| Metric | Value |
| :--- | :--- |
| **Total Energy** | **208.92 kWh** |
| **Total Electricity Cost** | **₹1,671.33** |
| **Units Produced** | **150 units** |
| **Energy per Unit** | **1.393 kWh/unit** |
| **Jobs Completed** | **12 / 12 (0 Late, 0 Delay)** |
| **Factory Utilization** | **38.5%** |
| **Telemetry Rows Produced** | **1,440 records (3 machines × 480 min)** |

#### Machine Breakdown
- **`CNC-01`:** Energy: `66.00 kWh` | Running: `180 min` | Idle: `300 min` | Util: `37.5%`
- **`CNC-02`:** Energy: `91.33 kWh` | Running: `205 min` | Idle: `275 min` | Util: `42.7%`
- **`CNC-03`:** Energy: `51.58 kWh` | Running: `170 min` | Idle: `310 min` | Util: `35.4%`

---

## 7. Limitations & Prompt 3 Boundary

In Prompt 2:
- Only `ALWAYS_READY` is executable.
- `FIXED_TIMER` and `IDLEWISE` return `501 Not Implemented`.
- Standby decision optimization, lookahead margin evaluation, and energy-saving calculations are strictly reserved for **Prompt 3**.
