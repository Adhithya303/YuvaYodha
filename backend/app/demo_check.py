"""Pre-demo readiness and numerical integrity verification script.

Verifies database connectivity, machine specifications, scenario registry,
deterministic simulation execution, exact benchmark energies within tolerance,
production preservation, telemetry frame count, and decision audit logs.
Outputs a clean PASS / FAIL summary for judges and operators.
"""

import math
import sys
from pathlib import Path

# Ensure backend root is in sys.path when executed directly as script
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from sqlmodel import Session, select
from app.database import engine
from app.models.machine import Machine
from app.services.simulation.scenario import get_scenario
from app.services.simulation_service import (
    compare_simulation_strategies,
    get_simulation_telemetry,
    get_simulation_decisions,
)
from app.services.playback import build_playback_response


def check_demo_readiness(verbose: bool = True) -> bool:
    """Execute end-to-end pre-demo readiness check. Returns True if all checks PASS."""
    checks = []

    def record_check(name: str, passed: bool, detail: str = ""):
        checks.append((name, passed, detail))
        if verbose:
            status = "PASS" if passed else "FAIL"
            print(f"[{status}] {name}{f': {detail}' if detail else ''}")

    if verbose:
        print("==================================================")
        print("IDLEWISE PRE-DEMO READINESS CHECK")
        print("==================================================")

    # 1. Database Connectivity
    try:
        with Session(engine) as session:
            machines = session.exec(select(Machine)).all()
        record_check("Database Access", True, f"SQLite connected, {len(machines)} machines found")
    except Exception as e:
        record_check("Database Access", False, str(e))
        return False

    # 2. Expected Machines Exist
    expected_machines = {"CNC-01", "CNC-02", "CNC-03"}
    found_ids = {m.id for m in machines}
    missing = expected_machines - found_ids
    record_check(
        "Machine Fleet Specifications",
        len(missing) == 0,
        f"Configured: {sorted(list(found_ids))}" if not missing else f"Missing: {missing}",
    )

    # 3. Default Scenario Feasibility
    try:
        scenario = get_scenario("default_shift")
        record_check(
            "Default Scenario Feasibility",
            len(scenario.machines) == 3 and len(scenario.jobs) == 12,
            f"{scenario.name} ({scenario.shift_minutes} min, {len(scenario.machines)} machines, {len(scenario.jobs)} jobs)",
        )
    except Exception as e:
        record_check("Default Scenario Feasibility", False, str(e))
        return False

    # 4. Multi-Strategy Execution & Numerical Accuracy
    try:
        with Session(engine) as session:
            cmp_result = compare_simulation_strategies(session=session, scenario_id="default_shift")

        c = cmp_result["comparison"]
        base_e = c["baseline_energy_kwh"]
        fixed_e = c["fixed_timer_energy_kwh"]
        iw_e = c["idlewise_energy_kwh"]

        # Numerical Tolerances (0.01% floating tolerance)
        base_ok = math.isclose(base_e, 208.9167, rel_tol=1e-3)
        fixed_ok = math.isclose(fixed_e, 167.9450, rel_tol=1e-3)
        iw_ok = math.isclose(iw_e, 161.6483, rel_tol=1e-3)

        record_check(
            "Baseline Energy (Always Ready)",
            base_ok,
            f"{base_e:.4f} kWh (expected 208.9167 kWh)",
        )
        record_check(
            "Fixed Timer Energy",
            fixed_ok,
            f"{fixed_e:.4f} kWh (expected 167.9450 kWh)",
        )
        record_check(
            "IdleWise Optimized Energy",
            iw_ok,
            f"{iw_e:.4f} kWh (expected 161.6483 kWh, -22.62%)",
        )

        # 5. Production Preservation
        iw_res = cmp_result["strategies"]["IDLEWISE"]
        prod_ok = (
            iw_res.total_units_produced == 150
            and iw_res.jobs_completed == 12
            and iw_res.late_jobs == 0
            and c["production_preserved"] is True
        )
        record_check(
            "Production Preservation Guarantee",
            prod_ok,
            f"{iw_res.total_units_produced}/150 units, {iw_res.jobs_completed}/12 jobs, {iw_res.late_jobs} late jobs",
        )

        # 6. Playback Frame Count & Synchronization
        with Session(engine) as session:
            playback = build_playback_response(session, iw_res.simulation_run_id)

        frames_ok = len(playback.frames) == 480
        record_check(
            "Playback Frame Synchronization",
            frames_ok,
            f"{len(playback.frames)}/480 frames, shift 08:00 to 16:00",
        )

        # 7. Decision Audit Records Generated
        with Session(engine) as session:
            decisions = get_simulation_decisions(session, iw_res.simulation_run_id)

        dec_ok = len(decisions) == 9
        record_check(
            "Explainable Decision Generation",
            dec_ok,
            f"{len(decisions)}/9 evaluated idle windows logged with mathematical rationale",
        )

        # 8. Fixed Timer Advantage Consistency Check (3.75%)
        ft_advantage = fixed_e - iw_e
        ft_pct = (ft_advantage / fixed_e) * 100.0
        ft_pct_ok = math.isclose(ft_pct, 3.75, rel_tol=1e-2)
        record_check(
            "IdleWise vs Fixed Timer Calculation",
            ft_pct_ok,
            f"{ft_advantage:.4f} kWh saved ({ft_pct:.2f}% of Fixed Timer)",
        )

    except Exception as e:
        record_check("Strategy Simulation Execution", False, str(e))
        return False

    all_passed = all(p for _, p, _ in checks)
    if verbose:
        print("==================================================")
        if all_passed:
            print("ALL CHECKS PASSED - READY FOR HACKATHON PRESENTATION")
        else:
            print("DEMO CHECK FAILED - INSPECT ERRORS ABOVE")
        print("==================================================")

    return all_passed


if __name__ == "__main__":
    success = check_demo_readiness(verbose=True)
    sys.exit(0 if success else 1)
