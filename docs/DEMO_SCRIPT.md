# IdleWise — 3-Minute Hackathon Presentation Script

**Schneider Electric Yuva Yodha Hackathon**  
**Challenge 4:** Smart Manufacturing / Industrial Energy & Process Efficiency  
**Target Duration:** 3 minutes (180 seconds)  

---

### [0:00 – 0:25] The Problem: The Invisible Idle Energy Leak
**Presenter Action:** Stand on the **Executive Overview** page. Point to the shift status strip.  
**Talking Points:**
> "Good morning, esteemed judges. In manufacturing SMEs, factories often know how much electricity they consume each month, but they don't know what an individual machine should do when it finishes a batch and waits for the next one.
>
> In typical CNC workshops, machines spend 30% to 60% of their day waiting between production jobs. Leaving them fully powered on in `IDLE_READY` continuously wastes expensive electricity. But shutting them down blindly risks missing production deadlines because restarting takes time and energy.
>
> We built **IdleWise** to turn non-productive machine idle time into measurable energy savings—without ever slowing down production."

---

### [0:25 – 0:50] The Demo Factory Setup & Three Strategies
**Presenter Action:** Click **"Start Guided Demo (90s)"** or scroll down to the Strategy Comparison Table.  
**Talking Points:**
> "To prove this scientifically, we simulated a realistic SME discrete manufacturing shift: 8 hours, 3 CNC machines, 12 customer production orders, and 150 total units.
>
> We evaluated three operational strategies under identical deterministic conditions:
> 1. **Strategy A (Always Ready):** The industry baseline. Machines stay continuously ready, consuming 208.92 kWh.
> 2. **Strategy B (Fixed Timer):** The conventional approach. If an idle window exceeds 30 minutes, it enters standby. This reaches 167.95 kWh.
> 3. **Strategy C (IdleWise Engine):** Our constraint-aware optimization that evaluates machine economics, warmup restart times, and the exact schedule of the incoming job."

---

### [0:50 – 1:20] The Verified Core Result
**Presenter Action:** Highlight the Primary KPI Cards (161.65 kWh, 22.62% saving, 150/150 units).  
**Talking Points:**
> "Here is our verified result:
> IdleWise completes the shift at **161.65 kWh**—achieving a **22.62% energy reduction** and saving **₹378.15** in a single 8-hour shift.
>
> Most importantly: **Production throughput is 100% preserved.** All 12 jobs finished on schedule, all 150 units were manufactured, and there were exactly zero late minutes.
>
> Notice also that IdleWise uses **3.75% less energy than the Fixed Timer**. Why? Because fixed timers cannot distinguish between a machine that saves energy by shutting down versus one where restart penalties exceed savings."

---

### [1:20 – 2:05] Live Playback & Gantt Timeline Synchronization
**Presenter Action:** Navigate to **Simulation**, select speed **"240x Demo Speed"**, click **"Play Replay"**, and let it advance past 10:00, then scrub or click the decision pin `⚡` on CNC-01 at 10:00.  
**Talking Points:**
> "Let’s watch how this happens on the shop floor.
> On our operational Gantt timeline, look at **CNC-01 at 10:00**.
> When `JOB-102` completes, IdleWise knows the next job `JOB-103` begins at 11:00—a 60-minute gap.
>
> Watch the operational sequence:
> 1. At 10:00, IdleWise powers CNC-01 down into safe `OFF` mode (drawing only 0.10 kW).
> 2. At 10:50, 10 minutes before the job, it automatically initiates `STARTING` warmup.
> 3. At 10:55, it enters `IDLE_READY` for an explicit 5-minute safety buffer.
> 4. At 11:00 sharp, the machine is warm, stabilized, and starts `JOB-103` on time! Zero operator delay."

---

### [2:05 – 2:35] Transparent Explainability
**Presenter Action:** Click the decision pin `⚡` to open the **Decision Detail Drawer**. Show the candidate table.  
**Talking Points:**
> "Factory operators reject black-box AI. IdleWise is 100% transparent and explainable.
>
> In this drawer, the operator can see the mathematical breakdown:
> - Keeping ready would have consumed **6.00 kWh**.
> - Standby would have consumed **1.73 kWh**.
> - Safe shutdown consumed only **1.18 kWh** (including warmup energy and safety buffer).
>
> IdleWise selected Shutdown because it provided the lowest safe energy while complying with the machine's 30-minute minimum off-time constraint."

---

### [2:35 – 3:00] What-If Sandbox & Schneider Ecosystem Fit
**Presenter Action:** Briefly show the **What-If Sandbox Lab** on the Insights tab, then close.  
**Talking Points:**
> "In our What-If Sandbox, plant managers can simulate tariff hikes or machine power upgrades with instant recalculation—and our built-in production defense rule warns if any change causes a late job.
>
> **Where does IdleWise fit?**
> IdleWise does not seek to replace Schneider Electric’s world-class infrastructure. Instead, it acts as a lightweight, SME-friendly decision layer that could consume telemetry from Schneider PM8000 power meters and Modicon PLCs to give operators clear, automated recommendations.
>
> With IdleWise, manufacturing SMEs can achieve **measurable energy savings between jobs without slowing down production**.
>
> Thank you, and we welcome your questions!"
