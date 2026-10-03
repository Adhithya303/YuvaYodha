# IdleWise — What-If Experimentation Sandbox

Schneider Electric Hackathon — Challenge 4: Smart Manufacturing

---

## 1. Overview & Objective

The **What-If Experimentation Sandbox** allows plant managers and judges to explore how changes in operational policy, economic conditions, and machine physical parameters impact factory shift energy and costs.

The core guiding principle of the What-If Sandbox is **Backend Deterministic Recomputation**:
- IdleWise never calculates fake or estimated savings in the frontend browser.
- Every assumption change is transmitted to the FastAPI backend simulation engine.
- The full 480-minute shift is re-simulated using the discrete time-step physics model.
- Real telemetry, state transitions, warmup energy penalties, and production deliveries are computed before results are displayed.

---

## 2. Supported Parameters

The What-If Lab exposes controlled knobs covering strategy policy, economics, and machine constraints:

| Category | Parameter | Range | Default | Unit | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Policy** | `fixed_timer_threshold_min` | 1 – 60 | 30 | min | Static idle duration before entering Standby |
| **Policy** | `minimum_saving_kwh` | 0.01 – 1.00 | 0.10 | kWh | Minimum required net energy reduction to justify state transition |
| **Policy** | `allow_shutdown` | boolean | true | — | Whether zero-power deep sleep is evaluated for long idle gaps |
| **Economics**| `electricity_tariff_per_kwh` | 1.0 – 30.0 | 8.00 | ₹/kWh | Grid electricity tariff applied to shift energy consumption |
| **Machine** | `idle_power_kw` | 0.5 – 25.0 | 6.00 | kW | Active power consumed while waiting ready between jobs |
| **Machine** | `standby_power_kw` | 0.1 – 10.0 | 1.00 | kW | Low-power mode consumption requiring restart warmup |
| **Machine** | `restart_duration_min` | 1 – 30 | 5 | min | Warmup duration required before processing resumes |
| **Machine** | `safety_buffer_min` | 0 – 20 | 5 | min | Margin scheduled before next job start to protect production |

---

## 3. Strict Scenario Immutability

What-If experiments must **never permanently alter** base factory configurations or database seed records.

### Implementation Architecture
1. The frontend passes temporary overrides via `scenario_overrides` inside the `SimulationRunRequest` or `StrategyComparisonRequest`.
2. When the backend receives overrides, it retrieves the base registered scenario from `SCENARIO_REGISTRY` and invokes:
   ```python
   cloned_scenario = base_scenario.model_copy(deep=True)
   ```
3. Overrides are applied **exclusively to the in-memory clone**:
   - `cloned_scenario.electricity_tariff_per_kwh`
   - `cloned_scenario.machines[id].idle_power_kw`, etc.
4. The clone is validated via `validate_scenario(cloned_scenario)`.
5. The simulation engine executes using the cloned scenario, producing independent telemetry and simulation records.
6. The base scenario in `SCENARIO_REGISTRY` and stored machine records in SQLite remain completely unmodified.
7. Clicking **"Reset to Default Parameters"** in the UI instantly restores base parameters without requiring a server reboot or database reseed.

---

## 4. Production Preservation Defense Rule

An essential criterion in manufacturing optimization is:
> **Energy reduction must never be achieved by sacrificing production deadlines.**

The What-If Sandbox enforces a strict visual defense banner:
- **Green Banner**: Rendered only when all 150 finished units are produced, all 12 scheduled jobs are completed, and late jobs equal exactly 0.
- **Red Warning Banner**: If a user tests aggressive parameters that delay machine restart and result in late jobs, the UI displays:
  > *"Production Violation Warning: Energy changed, but production throughput was compromised. Never celebrate energy savings that violate production delivery constraints!"*

---

## 5. Experiment Presets

To facilitate rapid demonstration during hackathon judging, three validated presets are provided:

1. **Default (Normal Balanced)**:
   - Threshold: `30 min`, Min Saving: `0.10 kWh`, Shutdown: `Enabled`, Tariff: `₹8.00`.
   - Balanced SME policy providing verified 22.62% energy reduction with 100% throughput safety.
2. **Conservative (No Shutdown)**:
   - Threshold: `45 min`, Min Saving: `0.25 kWh`, Shutdown: `Disabled`.
   - Models facilities where operators disallow machine power cycling, relying solely on Standby mode.
3. **Aggressive (Fast Standby)**:
   - Threshold: `15 min`, Min Saving: `0.02 kWh`, Shutdown: `Enabled`.
   - Aggressively captures short 15–20 minute inter-job gaps for maximum energy avoidance.
