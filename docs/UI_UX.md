# IdleWise — Industrial UI/UX & Information Architecture

Schneider Electric Hackathon — Challenge 4: Smart Manufacturing / Industrial Energy & Process Efficiency

---

## 1. Design Character & Industrial Visual Language

IdleWise is an industrial decision-support system designed for manufacturing SME plant managers, energy engineers, and production supervisors. Its visual language avoids consumer fintech trends, glassmorphism, cyberpunk glow, or video-game 3D rendering.

Instead, IdleWise adopts the visual design principles of world-class industrial monitoring platforms, specifically **Schneider Electric EcoStruxure Power Monitoring Expert (PME)**, **Tulip Interfaces**, and **MachineMetrics**:

1. **High Information Density**: Screen space is organized into clean, functional telemetry tiles, structured comparative data tables, and high-contrast numerical metrics.
2. **Contextual Machine State Correlation**: As recommended by EcoStruxure PME reporting standards, energy consumption is directly correlated with machine operational modes (`RUNNING`, `IDLE_READY`, `STANDBY`, `STARTING`, `OFF`).
3. **Tabular Numeric Precision**: Tabular font numbers (`font-mono`) are used for all power ratings (kW), cumulative energy metrics (kWh), shift costs (₹), percentages (%), and timestamps (HH:MM) to ensure rapid scanning and vertical alignment.
4. **Calm, High-Contrast Palette**: Neutral slate and zinc backgrounds (`#f8fafc`, `#ffffff`, `#0f172a`), emerald green for optimized energy savings (`#059669`), amber for waiting idle ready (`#f59e0b`), blue for standby (`#3b82f6`), orange with diagonal striping for restart warmup (`#f97316`), and slate for shutdown (`#64748b`).
5. **No Color-Only Information**: Machine states, risk levels, and decision actions always pair accessible semantic colors with explicit textual labels and iconography.

---

## 2. Information Architecture & Navigation

The application uses a 4-pillar industrial navigation architecture designed to guide judges and operators through the decision-support journey:

```
                  ┌──────────────────────────────┐
                  │    IdleWise Navigation       │
                  └──────────────┬───────────────┘
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   [ Overview ]            [ Machines ]            [ Simulation ]          [ Insights ]
  Executive Impact        Fleet Specifications    Execution & Playback    Decision Audit
  Verified 22.6% Saving   Instantaneous Δ Power   Gantt Timeline          What-If Sandbox
  Production Integrity    Restart Parameters      Live Power Curves       Candidate Math
```

### A. Overview Page (Executive Impact Dashboard)
- **Hero Status Strip**: Product name, industrial subtitle, Schneider Electric Hackathon context, and `SIMULATED FACTORY PROTOTYPE` badge.
- **Primary Success Banner**: "22.62% less simulated shift energy with 100% production preserved."
- **Primary KPIs**:
  - Energy Saved: `47.27 kWh`
  - Energy Reduction: `22.62%`
  - Simulated Cost Saved: `₹378.15`
  - Production Preserved: `150 / 150 units`
  - Late Jobs: `0`
- **Energy Story Visual**: Recharts horizontal comparison bar chart comparing Always Ready (`208.92 kWh`), Fixed Timer (`167.95 kWh`), and IdleWise (`161.65 kWh`).
- **Strategy Summary**: One-sentence operational breakdown of Always Ready, Fixed Timer, and IdleWise.
- **Factory Snapshot**: 3 CNC machines with calculated idle-to-standby reduction opportunities.

### B. Machines Page (Fleet Energy Specifications)
- **Power Profile Bars**: Instantaneous power scale showing Running power (100%), Idle Ready power, Standby power, and Off power.
- **Instantaneous Opportunity**: Displays theoretical power drop from Idle to Standby (e.g., `-83.3%` on CNC-01) with explicit guidance that true shift savings require schedule and restart evaluation.
- **Operational Constraints**: Restart warmup time (min), warmup energy penalty (kWh), safety buffer (min), and minimum off time (min).
- **Policy Flags**: Standby Allowed and Shutdown Allowed indicators.

### C. Simulation Page (Strategy Execution, Replay & Gantt Timeline)
- **Configuration Bar**: Scenario selector, strategy selector, policy knobs (timer threshold, minimum saving, allow shutdown).
- **Comparison View**:
  - Comparative Highlight Banner with direct "Replay Strategy" CTAs.
  - Multi-Strategy Comparison Table across 12 operational, economic, and throughput dimensions.
  - Energy Composition Chart: Stacked bar chart showing shift energy breakdown by state (`Running`, `Idle Ready`, `Standby`, `Starting`, `Off`).
- **Virtual Shift Playback**:
  - Transport bar (Play, Pause, Restart, Step Forward, Step Backward, Speed 1x–120x, Scrub Slider).
  - Real-time factory power card and unit production progress.
  - Machine fleet status cards (state, power, active job, next job countdown).
  - Synchronized live power curve and real-time decision event feed.
  - **Machine Operational Gantt Timeline** with synchronized playhead.

### D. Insights Page (Decision Explorer & What-If Sandbox Lab)
- **Decision Explorer**:
  - Summary metrics: total decisions, standby count, shutdown count, total savings.
  - Highest Energy-Saving Decision card (dynamically identified).
  - Filterable audit trail by machine and recommended action.
  - Interactive item cards with "Inspect Why" drawer trigger and "Seek in Playback" buttons.
- **Decision Detail Drawer**:
  - Plain English operational rationale.
  - Candidate comparison table ($E_{\text{keep}}$, $E_{\text{standby}}$, $E_{\text{shutdown}}$).
  - Restart timing schedule and safety buffer verification.
  - Expandable mathematical formulations.
- **What-If Experimentation Lab**:
  - Interactive parameter controls for strategy policy, tariff, and machine ratings.
  - Presets: Default (Normal), Conservative (No Shutdown), Aggressive.
  - Side-by-side Original vs What-If impact table with production preservation defense warning.
  - "Reset to Default" button.

---

## 3. Machine Operational Gantt Timeline

The Gantt timeline (`MachineTimeline.tsx`) visualizes machine states across the entire 8-hour shift (08:00 to 16:00, 480 minutes).

### Telemetry Segment Compression
Rather than rendering 480 individual DOM nodes per machine (which creates DOM bloat and visual noise), the `compressMachineTelemetry()` utility merges consecutive identical operational states:
- Consecutive minutes with identical `state` and `active_job_id` are grouped into one segment.
- A 50-minute shutdown window (minute 120 to 170) is rendered as a single continuous block: `OFF (10:00–10:50, 50 min, avg 0.1 kW)`.
- Flex percentage widths (`(duration / 480) * 100%`) maintain mathematical proportionality.

### Playhead Synchronization
- An animated red/emerald vertical laser line tracks `currentMinute` in real time during playback.
- A floating flag at the top of the playhead displays the exact simulation timestamp: `10:30 (150m)`.
- Clicking anywhere on the hourly time ruler scrubs playback directly to that minute.

### Decision Markers
- Pinned diamonds (⚡) indicate the exact timestamps where IdleWise evaluated an idle window.
- Marker colors match the recommended action: blue for `STANDBY`, amber for `SHUTDOWN`, slate for `KEEP_READY`.
- Clicking any marker opens the Decision Detail Drawer and can seek playback to that decision minute.

---

## 4. Accessibility & Responsive Engineering

- **Screen Readers & Keyboard Navigation**: Timeline segments, buttons, and drawer dialogs implement semantic ARIA roles (`role="button"`, `aria-label`, `tabIndex={0}`, `aria-modal="true"`).
- **Responsive Layout**:
  - Desktop (1440×900, 1366×768): High-density 3-column machine grids, side-by-side comparative charts, and fixed timeline view.
  - Tablet/Mobile (768px): Sticky horizontal scroll container for Gantt timeline (`min-w-[760px]`), stacked comparison tables, and full-width decision drawer overlay.
