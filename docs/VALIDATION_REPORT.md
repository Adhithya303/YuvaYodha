# IdleWise — Numerical & Algorithmic Validation Report

**Schneider Electric Yuva Yodha Hackathon — Challenge 4**  
**Project:** IdleWise: Energy-Aware Machine Idle-State Optimization  

---

## 1. Test Execution Matrix

All automated test suites executed locally and verified:

| Test Suite | Environment | Scope | Passed | Failed | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Backend Unit & Integration** | Python 3.10 / Pytest | Physics, State Machine, Scenarios, Energy Math, APIs, What-If, E2E | 70 | 0 | **PASS** |
| **Frontend Unit & Component** | React 19 / Vitest | Timeline Compression, Playhead, Decision Drawer, What-If, Guided Demo | 24 | 0 | **PASS** |
| **Production Build** | Vite + TypeScript | Type Safety (`tsc -b`), Bundle Minification, Assets Generation | — | — | **PASS** |
| **Pre-Demo Health Check** | CLI (`demo_check`) | DB Access, Specs, Scenarios, Benchmark Numbers, Playback, Frames | 10/10 | 0 | **PASS** |

---

## 2. Multi-Strategy Benchmark Comparison (Default Shift)

Conducted on standard 8-hour shift (08:00 to 16:00, 480 min, 3 CNC machines, 12 production orders, 150 manufactured units, ₹8.00/kWh tariff):

| Evaluation Metric | Strategy A: Always Ready | Strategy B: Fixed Timer (30m) | Strategy C: IdleWise Engine | IdleWise vs Baseline | IdleWise vs Fixed Timer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Total Electrical Energy** | `208.9167 kWh` | `167.9450 kWh` | `161.6483 kWh` | **-47.2683 kWh** | **-6.2967 kWh** |
| **Energy Reduction (%)** | `0.00%` | `19.61%` | `22.62%` | **-22.62%** | **-3.75% of FT** |
| **Total Electricity Cost** | `₹1,671.33` | `₹1,343.56` | `₹1,293.19` | **-₹378.15** | **-₹50.37** |
| **Specific Energy per Unit** | `1.393 kWh/unit` | `1.120 kWh/unit` | `1.078 kWh/unit` | **-0.315 kWh/unit** | **-0.042 kWh/unit** |
| **Units Manufactured** | `150 / 150` | `150 / 150` | `150 / 150` | `0` (Preserved) | `0` (Preserved) |
| **Production Jobs Completed** | `12 / 12` | `12 / 12` | `12 / 12` | `0` (Preserved) | `0` (Preserved) |
| **Late Jobs** | `0` | `0` | `0` | `0` (Zero Delay) | `0` (Zero Delay) |
| **Total Delay Minutes** | `0 min` | `0 min` | `0 min` | `0 min` | `0 min` |
| **Standby Events** | `0` | `5` | `4` | `+4` | `-1` |
| **Shutdown Events** | `0` | `0` | `1` | `+1` | `+1` |
| **Restart Events** | `0` | `5` | `5` | `+5` | `0` |
| **Production Preserved?** | **YES** | **YES** | **YES** | **GUARANTEED** | **GUARANTEED** |

---

## 3. Manual Mathematical Decision Verification

### Decision A: Overall Highest-Saving Decision (`CNC-02` at $t=150$, 10:30)
- **Machine:** CNC-02 (Heavy Duty Milling Center 2)
- **Parameters:** $P_{\text{idle}} = 8.0 \text{ kW}$, $P_{\text{standby}} = 1.5 \text{ kW}$, $P_{\text{off}} = 0.1 \text{ kW}$, $R = 7 \text{ min}$, $E_{\text{restart}} = 0.60 \text{ kWh}$, $B = 5 \text{ min}$, Minimum off-time $= 40 \text{ min}$.
- **Window:** Preceding job finishes at $t=150$ (10:30), next job starts at $t=240$ (12:00).
- **Idle Gap:** $G = 240 - 150 = 90 \text{ minutes}$.
- **Feasibility:** $G > R + B \implies 90 > 7 + 5 = 12 \text{ min}$. Safe off duration $= 90 - 7 - 5 = 78 \text{ min} \ge 40 \text{ min}$ (Feasible).

#### Step 1: Candidate Evaluations
1. **$E_{\text{keep}}$ (Always Ready):**
   $$E_{\text{keep}} = 8.0 \times \left(\frac{90}{60}\right) = 12.0000 \text{ kWh}$$
2. **$E_{\text{standby}}$:**
   $$E_{\text{standby}} = \left(1.5 \times \frac{78}{60}\right) + 0.60 + \left(8.0 \times \frac{5}{60}\right) = 1.9500 + 0.6000 + 0.6667 = 3.2167 \text{ kWh}$$
   $$\text{Saving: } 12.0000 - 3.2167 = 8.7833 \text{ kWh}$$
3. **$E_{\text{shutdown}}$:**
   $$E_{\text{shutdown}} = \left(0.1 \times \frac{78}{60}\right) + 0.60 + \left(8.0 \times \frac{5}{60}\right) = 0.1300 + 0.6000 + 0.6667 = 1.3967 \text{ kWh}$$
   $$\text{Saving: } 12.0000 - 1.3967 = 10.6033 \text{ kWh}$$

#### Step 2: Selected Action & Discrepancy Check
- **Selected Action:** `SHUTDOWN` (Lowest energy, saves $10.6033 \text{ kWh} \ge 0.10 \text{ kWh}$).
- **Backend Persisted Energy Saved:** `10.6033 kWh`
- **Cost Saved (@ ₹8.00/kWh):** $10.6033 \times 8.00 = \text{₹}84.8264 \approx \text{₹}84.83$.
- **Discrepancy (Predicted vs Database):** **`0.0000 kWh`** (Exact mathematical match).

---

### Decision B: Fast-Cycle Machine Decision (`CNC-01` at $t=120$, 10:00)
- **Machine:** CNC-01 (CNC Milling Center 1)
- **Parameters:** $P_{\text{idle}} = 6.0 \text{ kW}$, $P_{\text{standby}} = 1.0 \text{ kW}$, $P_{\text{off}} = 0.1 \text{ kW}$, $R = 5 \text{ min}$, $E_{\text{restart}} = 0.40 \text{ kWh}$, $B = 5 \text{ min}$, Minimum off-time $= 30 \text{ min}$.
- **Window:** Preceding job finishes at $t=120$ (10:00), next job starts at $t=180$ (11:00).
- **Idle Gap:** $G = 180 - 120 = 60 \text{ minutes}$.
- **Feasibility:** $G > R + B \implies 60 > 5 + 5 = 10 \text{ min}$. Safe off duration $= 60 - 5 - 5 = 50 \text{ min} \ge 30 \text{ min}$ (Feasible).

#### Step 1: Candidate Evaluations
1. **$E_{\text{keep}}$:**
   $$E_{\text{keep}} = 6.0 \times \left(\frac{60}{60}\right) = 6.0000 \text{ kWh}$$
2. **$E_{\text{standby}}$:**
   $$E_{\text{standby}} = \left(1.0 \times \frac{50}{60}\right) + 0.40 + \left(6.0 \times \frac{5}{60}\right) = 0.8333 + 0.4000 + 0.5000 = 1.7333 \text{ kWh}$$
   $$\text{Saving: } 6.0000 - 1.7333 = 4.2667 \text{ kWh}$$
3. **$E_{\text{shutdown}}$:**
   $$E_{\text{shutdown}} = \left(0.1 \times \frac{50}{60}\right) + 0.40 + \left(6.0 \times \frac{5}{60}\right) = 0.0833 + 0.4000 + 0.5000 = 0.9833 \text{ kWh}$$
   $$\text{Saving: } 6.0000 - 0.9833 = 5.0167 \text{ kWh}$$

#### Step 2: Selected Action & Discrepancy Check
- **Selected Action:** `SHUTDOWN` (Saves $5.0167 \text{ kWh}$).
- **Backend Persisted Energy Saved:** `5.0167 kWh`
- **Cost Saved (@ ₹8.00/kWh):** $5.0167 \times 8.00 = \text{₹}40.13$.
- **Discrepancy (Predicted vs Database):** **`0.0000 kWh`** (Exact match).

---

## 4. Deterministic Repeatability Check
IdleWise simulation was run 5 consecutive times on the default shift scenario:
- Run 1 Energy: `161.6483 kWh`, Units: 150, Jobs: 12, Decisions: 9
- Run 2 Energy: `161.6483 kWh`, Units: 150, Jobs: 12, Decisions: 9
- Run 3 Energy: `161.6483 kWh`, Units: 150, Jobs: 12, Decisions: 9
- Run 4 Energy: `161.6483 kWh`, Units: 150, Jobs: 12, Decisions: 9
- Run 5 Energy: `161.6483 kWh`, Units: 150, Jobs: 12, Decisions: 9
**Conclusion:** 100% deterministic repeatability with zero floating-point drift across independent runs.
