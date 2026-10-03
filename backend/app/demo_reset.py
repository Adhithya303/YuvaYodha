"""Demo data reset script.

Safely purges historical simulation runs, telemetry time-series, and decision audit logs,
while strictly preserving machine configurations, production job schedules, and scenario definitions.
"""

import sys
from pathlib import Path

# Ensure backend root is in sys.path when executed directly as script
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from sqlmodel import Session, select
from app.database import engine
from app.models.simulation_run import SimulationRun
from app.models.telemetry import Telemetry
from app.models.decision import Decision


def reset_demo_data(verbose: bool = True) -> int:
    """Purge simulation runs, telemetry, and decision records. Returns count of deleted runs."""
    with Session(engine) as session:
        runs = session.exec(select(SimulationRun)).all()
        run_count = len(runs)

        # Delete telemetry records
        telemetries = session.exec(select(Telemetry)).all()
        telemetry_count = len(telemetries)
        for t in telemetries:
            session.delete(t)

        # Delete decisions
        decisions = session.exec(select(Decision)).all()
        decision_count = len(decisions)
        for d in decisions:
            session.delete(d)

        # Delete simulation runs
        for r in runs:
            session.delete(r)

        session.commit()

        if verbose:
            print("==================================================")
            print("IDLEWISE DEMO RESET COMPLETED")
            print("==================================================")
            print(f"Purged Simulation Runs: {run_count}")
            print(f"Purged Telemetry Rows:  {telemetry_count}")
            print(f"Purged Decision Rows:   {decision_count}")
            print("Preserved Machine Specs and Seed Jobs.")
            print("==================================================")

        return run_count


if __name__ == "__main__":
    reset_demo_data(verbose=True)
