# IdleWise — Demo Fallback & Recovery Procedures

**Schneider Electric Yuva Yodha Hackathon — Challenge 4**  

In live hackathon environments, unexpected technical issues can occur. This document provides clear recovery plans and manual presentation paths.

---

### Contingency Scenario Matrix

| Failure Mode | Symptoms | Immediate Recovery Action | Alternative Demonstration Path |
| :--- | :--- | :--- | :--- |
| **Case A: Frontend UI Crash** | Browser displays white screen or JS uncaught exception | 1. Open DevTools console and hard reload (`Ctrl+Shift+R`).<br>2. Run `npm run build && npm run preview`. | Open Swagger API Docs at `http://127.0.0.1:8000/docs`. Execute `POST /api/v1/simulations/compare` and showcase the JSON comparative output. |
| **Case B: Backend Service Down** | Frontend shows "Backend Offline" red pill | 1. Check Terminal 1.<br>2. Restart backend: `python -m uvicorn app.main:app --port 8000 --reload`.<br>3. Verify via `python -m app.demo_check`. | Present the static verified tables and mathematical validations in [`docs/VALIDATION_REPORT.md`](VALIDATION_REPORT.md) and [`docs/EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md). |
| **Case C: Internet Unavailable** | Venue Wi-Fi drops | No action needed! IdleWise runs **100% offline** on localhost: zero external APIs, zero remote CDNs, and zero cloud databases. | Proceed with live demo as normal on `http://127.0.0.1:5173/`. |
| **Case D: Playback Animation Stalls** | Virtual shift replay slider stops advancing | 1. Click "Pause" then "Play".<br>2. Select "240x Demo Speed".<br>3. Or drag scrubber directly to minute 120 (10:00). | Switch directly to the **Insights** tab and demonstrate the **Decision Explorer** and **Decision Detail Drawer** without requiring continuous animation. |
| **Case E: Database Corrupted** | SQLAlchemy operational error / table missing | Run CLI command:<br>`cd backend`<br>`python -m app.demo_setup` | This automatically re-initializes SQLite schema, reseeds machines, and regenerates default benchmark runs. |

---

### Fast Diagnostic Checklist
Before taking the stage, run this single command in PowerShell/Terminal:
```powershell
cd backend
python -m app.demo_check
```
If output displays `ALL CHECKS PASSED — READY FOR HACKATHON PRESENTATION`, the system is fully operational.
