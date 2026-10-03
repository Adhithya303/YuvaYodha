# IdleWise Database Documentation

## 1. Why SQLite Was Selected

For the IdleWise hackathon prototype, **SQLite** was intentionally chosen:
- **Zero-Configuration:** It requires no external database service, daemon, port binding, credentials, or network configuration.
- **Embedded & Self-Contained:** The database is an isolated local file that is created on-demand, making it 100% reproducible for evaluators and judges on any machine.
- **High Performance for Simulation:** Simulation time-steps (1-minute discrete intervals) execute in memory or local disk in milliseconds without network round-trip overhead.
- **No Manual Database Setup:** Evaluators do not need MySQL Workbench, PostgreSQL, Docker, or `CREATE DATABASE` queries.

---

## 2. Automatic Database Creation (No Manual Steps)

**No manual database or table creation is required.**
When the FastAPI backend starts (`app.main`), its lifespan hook automatically:
1. Verifies or creates the `backend/data/` directory.
2. Initializes the SQLite database file at `backend/data/idlewise.db`.
3. Executes `SQLModel.metadata.create_all(engine)` to create all 5 tables automatically if they do not exist.

---

## 3. Database Location

- **File Path:** `backend/data/idlewise.db`
- **Configurable URL:** `DATABASE_URL` in `.env` (defaults to `sqlite:///<absolute_path_to_backend>/data/idlewise.db`).
- **Git Ignore:** Runtime `.db`, `.db-wal`, and `.db-shm` files are ignored via `.gitignore` to prevent committing binary runtime states to source control.

---

## 4. Tables and Schemas

| Table Name | Description | Key Attributes |
| :--- | :--- | :--- |
| `machines` | Machine specifications and energy ratings | `id` (PK, e.g. CNC-01), `name`, `machine_type`, `run_power_kw`, `idle_power_kw`, `standby_power_kw`, `off_power_kw`, `restart_duration_min`, `restart_energy_kwh`, `standby_allowed`, `shutdown_allowed`, `minimum_off_time_min`, `safety_buffer_min` |
| `jobs` | Production job schedules | `id` (PK, e.g. JOB-001), `job_name`, `product_type`, `machine_id` (FK), `scheduled_start`, `duration_min`, `deadline`, `status`, `quantity` |
| `telemetry` | Time-step operational and power records *(used in Prompt 2+)* | `id` (PK), `timestamp` (sim minute), `machine_id` (FK), `machine_state` (RUNNING, IDLE_READY, STANDBY, STARTING, OFF), `power_kw`, `active_job_id`, `simulation_run_id` |
| `decisions` | Transparent audit log of IdleWise recommendations *(used in Prompt 3+)* | `id` (PK), `timestamp`, `machine_id` (FK), `simulation_run_id`, `current_state`, `recommended_action` (KEEP_READY, STANDBY, SHUTDOWN), `idle_window_min`, `estimated_energy_saved_kwh`, `estimated_cost_saved`, `production_risk` (LOW, MEDIUM, HIGH), `reason` |
| `simulation_runs` | Aggregated experiment runs across strategies *(used in Prompt 2+)* | `id` (PK UUID), `scenario_name`, `strategy` (ALWAYS_READY, FIXED_TIMER, IDLEWISE), `status`, `total_energy_kwh`, `total_cost`, `jobs_completed`, `late_jobs`, `total_delay_minutes`, `energy_per_unit` |

---

## 5. Development Seeding

To populate the database with synthetic machine profiles and sample jobs:

```bash
cd backend
python -m app.seed
```

This creates:
- **3 Synthetic Machines:**
  - `CNC-01` (12 kW Run / 6 kW Idle / 1 kW Standby / 5 min restart)
  - `CNC-02` (16 kW Run / 8 kW Idle / 1.5 kW Standby / 7 min restart)
  - `CNC-03` (10 kW Run / 4.5 kW Idle / 0.8 kW Standby / 4 min restart)
- **6 Initial Jobs:** Scheduled test batches validating machine association and queues.

> **Synthetic Data Disclaimer:** These values represent synthetic modeling assumptions for simulation and do NOT claim to represent actual Schneider Electric equipment or measured customer machines.

---

## 6. How to Reset the Database

To completely wipe and recreate the database:
```bash
# In Windows PowerShell:
Remove-Item backend/data/idlewise.db

# Then re-seed:
cd backend
python -m app.seed
```
All tables will be recreated from scratch on the next backend start or seed execution.
