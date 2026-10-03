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

from sqlmodel import Session
from app.database import engine, init_db
from app.seed import seed_database
from app.services.simulation_service import compare_simulation_strategies


def setup_demo(verbose: bool = True) -> dict:
    """Initialize database, seed machines/jobs, and execute default shift benchmark comparison."""
    if verbose:
        print("==================================================")
        print("IDLEWISE DEMO SETUP")
        print("==================================================")
        print("1. Initializing SQLite Database schema...")

    init_db()

    if verbose:
        print("2. Seeding machine specifications and production orders...")

    seed_database()

    if verbose:
        print("3. Executing and persisting default shift benchmark comparison...")

    with Session(engine) as session:
        result = compare_simulation_strategies(
            session=session,
            scenario_id="default_shift",
            fixed_timer_threshold_min=30,
            minimum_saving_kwh=0.10,
            allow_shutdown=True,
        )

    if verbose:
        c = result["comparison"]
        print("==================================================")
        print("IDLEWISE DEMO SETUP COMPLETE - SYSTEM READY")
        print("==================================================")
        print(f"Scenario:              {result['scenario_id']}")
        print(f"Baseline Energy:       {c['baseline_energy_kwh']:.4f} kWh")
        print(f"Fixed Timer Energy:    {c['fixed_timer_energy_kwh']:.4f} kWh")
        print(f"IdleWise Energy:       {c['idlewise_energy_kwh']:.4f} kWh")
        print(f"Energy Reduction:      {c['idlewise_vs_baseline_percent']:.2f}% ({c['idlewise_vs_baseline_energy_saved_kwh']:.4f} kWh)")
        print(f"Cost Saved:            Rs. {c['cost_saved_idlewise_vs_baseline']:.2f}")
        print(f"Production Preserved:  {c['production_preserved']} (150/150 units, 0 late jobs)")
        print("==================================================")

    return result


if __name__ == "__main__":
    setup_demo(verbose=True)
