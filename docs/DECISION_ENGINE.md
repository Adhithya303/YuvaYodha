# IdleWise Decision & Optimization Engine

**Phase:** Prompt 3 of 6  
**Module:** Deterministic Energy-Aware Machine Idle-State Decision Engine  
**Challenge:** Schneider Electric Hackathon — Challenge 4: Smart Manufacturing / Industrial Energy & Process Efficiency

---

## 1. What IdleWise Solves

In manufacturing SMEs, CNC machines, presses, and specialized machine tools spend 30% to 60% of their operational shift waiting between jobs. While waiting, they often remain in a high-power `IDLE_READY` state, keeping hydraulic pumps, chillers, spindle servos, and auxiliary electronics energized.

Simply powering machines down during waiting periods is risky:
- Warming up and restarting equipment takes measurable time ($R$).
- Restart events draw transient energy spikes ($E_{\text{restart}}$).
- Repeated thermal cycling can cause equipment stress.
- Unexpected job start delays compromise production delivery deadlines.

**IdleWise provides an explainable, deterministic decision-support layer** that answers the fundamental question:
> *"When this machine completes a production job, what state should it adopt until its next scheduled requirement, and exactly when must it begin warming up so that production throughput is 100% protected?"*

---

## 2. Decision Flow Architecture

```
                 Machine completes production job at minute T
                                      |
                                      v
                        Find next scheduled job on machine
                                      |
                                      v
                      Inter-job idle window exists?
                         |                     |
                        No                    Yes
                         |                     |
               Baseline IDLE_READY        Compute G = t_next - T
                                               |
                                               v
                                      Is G > R + B?
                                         |        |
                                        No       Yes
                                         |        |
                                    KEEP READY    |
                           (RESTART_MARGIN_INSUFFICIENT)
                                                  v
                                     Evaluate Candidate Energy
                                       /          |          \
                                  KEEP_READY   STANDBY    SHUTDOWN
                                       \          |          /
                                        \         |         /
                                          Compare Feasibility
                                       & Min Saving (>= 0.10 kWh)
                                                  |
                                                  v
                                        Select Lowest Safe Energy
                                            Feasible Candidate
                                                  |
                                                  v
                                      Generate Human Explanation
                                         & Machine Plan (Timings)
                                                  |
                                                  v
                                      Execute Plan in Simulator
```

---

## 3. The Three Operational Strategies

| Strategy | Type | Decision Logic | Economic Awareness |
| :--- | :--- | :--- | :--- |
| **Strategy A: Always Ready** | Baseline (Control) | Machine remains in `IDLE_READY` state continuously between production jobs. | None. Established unoptimized reference energy. |
| **Strategy B: Fixed Timer** | Conventional Policy | If idle gap $G > \text{threshold}$ (default: 30 min) and $G > R + B$, machine enters `STANDBY`. | None. Decides purely on clock duration, ignoring idle/standby power differential and restart energy penalty. |
| **Strategy C: IdleWise Engine** | Optimization Engine | Evaluates power deltas, restart penalty, minimum off-time, and safety margins to pick lowest-energy feasible state (`KEEP_READY`, `STANDBY`, or `SHUTDOWN`). | Full. Quantifies net kWh and cost savings before approving any transition. |

---

## 4. Inter-Job Idle Window Definition

An eligible decision window is strictly an **inter-job idle window**:
- Begins at minute $t_{\text{start}}$ when a production job completes.
- Ends at minute $t_{\text{next}}$ when the next scheduled job on that same machine begins.
- Duration: $G = t_{\text{next}} - t_{\text{start}}$.

### Scientific Fairness & Boundary Protection
1. **Before First Job:** The period between shift start ($t=0$) and a machine's first job is **not** counted as an IdleWise innovation. The machine remains in `IDLE_READY`.
2. **After Final Job:** The period after a machine finishes its last scheduled job until shift end (e.g. 16:00) is **not** counted as an inter-job idle window.
3. **Primary Metric:** IdleWise evaluates and optimizes the non-productive gaps *between* production batches.
4. **Single Decision Principle:** Each eligible inter-job idle window produces **exactly one primary decision** and a deterministic execution plan, avoiding redundant minute-by-minute re-evaluations.

---

## 5. Mathematical Energy Models

### A. Keep-Ready Candidate (Fallback)
The machine remains powered on in `IDLE_READY` consuming idle power $P_{\text{idle}}$:
$$E_{\text{keep}} = P_{\text{idle}} \times \left(\frac{G}{60}\right) \text{ kWh}$$

### B. Standby Candidate
Feasible when `standby_allowed == True` and $G > R + B$.
- Safe standby duration:
  $$\Delta t_{\text{standby}} = G - R - B$$
- Scheduled timeline:
  - $[t_{\text{start}}, t_{\text{next}} - R - B)$: Machine in `STANDBY` ($\Delta t_{\text{standby}}$ minutes)
  - $[t_{\text{next}} - R - B, t_{\text{next}} - B)$: Machine in `STARTING` ($R$ minutes)
  - $[t_{\text{next}} - B, t_{\text{next}})$: Machine in `IDLE_READY` ($B$ minutes)
- Total standby plan energy:
  $$E_{\text{standby}} = \left(P_{\text{standby}} \times \frac{\Delta t_{\text{standby}}}{60}\right) + E_{\text{restart}} + \left(P_{\text{idle}} \times \frac{B}{60}\right)$$
- Net saving:
  $$\Delta E_{\text{standby}} = E_{\text{keep}} - E_{\text{standby}}$$

### C. Shutdown Candidate
Feasible when `allow_shutdown == True`, `shutdown_allowed == True`, $G > R + B$, and $(G - R - B) \ge \text{minimum\_off\_time\_min}$.
- Safe off duration:
  $$\Delta t_{\text{off}} = G - R - B$$
- Total shutdown plan energy:
  $$E_{\text{shutdown}} = \left(P_{\text{off}} \times \frac{\Delta t_{\text{off}}}{60}\right) + E_{\text{restart}} + \left(P_{\text{idle}} \times \frac{B}{60}\right)$$
- Net saving:
  $$\Delta E_{\text{shutdown}} = E_{\text{keep}} - E_{\text{shutdown}}$$

---

## 6. Restart Energy Modeling (No Double-Counting)

Configured machine parameter `restart_energy_kwh` represents the **total electrical energy consumed during one complete warmup restart cycle**.

To prevent double-counting:
1. Equivalent average power during `STARTING` is derived:
   $$P_{\text{starting}} = \frac{E_{\text{restart}}}{\left(\frac{R}{60}\right)} \text{ kW}$$
2. In discrete time-step simulation, each 1-minute step in `STARTING` state accumulates:
   $$E_{\text{step}} = P_{\text{starting}} \times \left(\frac{1}{60}\right) \text{ kWh}$$
3. Over the $R$ restart minutes, total accumulated energy equals $E_{\text{restart}}$ exactly.

---

## 7. Safety Buffer & Absolute Production Guarantee

For every optimized action (`STANDBY` or `SHUTDOWN`):
$$\text{ready\_minute} = t_{\text{next}} - B$$
$$\text{restart\_start} = t_{\text{next}} - R - B$$

The machine completes its warmup and enters `IDLE_READY` at least $B$ minutes before the scheduled job begins. The incoming production job never waits for machine warmup.

---

## 8. Minimum Saving Threshold & Tie-Breaking

To avoid machine cycling for negligible gains, a configurable threshold is enforced:
$$\Delta E \ge \text{minimum\_saving\_kwh} \quad (\text{default: } 0.10 \text{ kWh})$$

If multiple candidates satisfy constraints and minimum savings:
1. Candidate with lowest energy consumption is selected.
2. If $|E_{\text{standby}} - E_{\text{shutdown}}| \le 10^{-6}$, the less aggressive state (`STANDBY`) is chosen to reduce equipment cycling.

---

## 9. Machine-Readable Reason Codes

| Reason Code | Condition |
| :--- | :--- |
| `SHORT_IDLE_WINDOW` / `RESTART_MARGIN_INSUFFICIENT` | $G \le R + B$. Window is too short to safely warm up. |
| `STANDBY_NOT_SUPPORTED` | Machine does not allow standby state transitions. |
| `SHUTDOWN_NOT_SUPPORTED` | Machine does not permit power shutdown. |
| `MINIMUM_OFF_TIME_VIOLATION` | Safe off duration is below machine's required minimum off-time. |
| `NO_MEANINGFUL_ENERGY_SAVING` | Standby or shutdown consumes more energy than keep-ready (or saves $< 0.10$ kWh). |
| `STANDBY_LOWEST_ENERGY` | Standby provides the lowest-energy feasible safe operating plan. |
| `SHUTDOWN_LOWEST_ENERGY` | Shutdown provides the lowest-energy feasible safe operating plan. |
| `FIXED_TIMER_THRESHOLD_EXCEEDED` | Fixed Timer: gap exceeds time threshold ($G > T$). |
| `FIXED_TIMER_BELOW_THRESHOLD` | Fixed Timer: gap is less than or equal to time threshold ($G \le T$). |
| `ALWAYS_READY_DEFAULT` | Baseline: machine continuously maintained in `IDLE_READY`. |

---

## 10. Default Shift Benchmark Verification

On the verified standard 8-hour shift (3 machines, 12 jobs, 150 units):

| Metric | Always Ready (Baseline) | Fixed Timer (30m) | IdleWise Engine |
| :--- | :--- | :--- | :--- |
| **Total Energy (kWh)** | **208.92 kWh** | **167.95 kWh** | **161.65 kWh** |
| **Energy Reduction vs Baseline** | — | -40.97 kWh (19.61%) | **-47.27 kWh (22.62%)** |
| **Energy Saved vs Fixed Timer** | — | — | **+6.30 kWh (+3.75%)** |
| **Total Cost** | ₹1,671.33 | ₹1,343.56 | **₹1,293.19** |
| **Cost Saved vs Baseline** | — | ₹327.77 | **₹378.15** |
| **Units Produced** | 150 units | 150 units | **150 units (100% Preserved)** |
| **Late Jobs** | 0 | 0 | **0** |
| **Standby Events** | 0 | 8 | 5 |
| **Shutdown Events** | 0 | 0 | 4 |
| **Restart Events** | 0 | 8 | 9 |

---

## 11. Current Limitations & Prototype Boundaries

1. **Deterministic Schedule Assumption:** Jobs are assumed to arrive exactly according to schedule. Job arrival uncertainty and dynamic rescheduling are reserved for future prompts.
2. **Warm vs Cold Restart:** The current machine model uses unified restart duration and energy parameters for both Standby and Off transitions. Future versions can model cold start penalties.
3. **No Hardware PLC Control:** This system is a decision-support and simulation tool. It does not interface with live industrial machine controls or safety PLCs.
4. **Deterministic Risk Rating:** Production risk is currently a deterministic constraint verification (`LOW`), not a Bayesian or probabilistic forecast.
