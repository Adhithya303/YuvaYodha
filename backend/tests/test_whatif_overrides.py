"""Unit and integration tests for What-If scenario parameter overrides and immutability."""

import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_session
from app.services.simulation.scenario import (
    get_scenario,
    DEFAULT_SHIFT_SCENARIO,
    ScenarioOverrides,
    MachineOverride,
    create_overridden_scenario,
)
from app.services.simulation_service import (
    run_and_persist_simulation,
    compare_simulation_strategies,
)
from app.models.simulation_run import StrategyType


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_scenario_immutability_on_override():
    """Verify that create_overridden_scenario does NOT mutate the base registered scenario."""
    base = get_scenario("default_shift")
    original_tariff = base.electricity_tariff_per_kwh
    original_cnc01_idle = next(m for m in base.machines if m.id == "CNC-01").idle_power_kw

    overrides = ScenarioOverrides(
        electricity_tariff_per_kwh=12.5,
        machines={"CNC-01": MachineOverride(idle_power_kw=9.5)},
    )
    overridden = create_overridden_scenario(base, overrides)

    assert overridden.electricity_tariff_per_kwh == 12.5
    assert next(m for m in overridden.machines if m.id == "CNC-01").idle_power_kw == 9.5

    # Check base scenario is untouched
    base_after = get_scenario("default_shift")
    assert base_after.electricity_tariff_per_kwh == original_tariff
    assert next(m for m in base_after.machines if m.id == "CNC-01").idle_power_kw == original_cnc01_idle


def test_whatif_tariff_recalculation(session: Session):
    """Verify that changing electricity tariff updates total cost proportionally without changing energy."""
    base_res = run_and_persist_simulation(
        session=session,
        scenario_id="default_shift",
        strategy_type=StrategyType.ALWAYS_READY,
    )

    overrides = ScenarioOverrides(electricity_tariff_per_kwh=16.0)
    whatif_res = run_and_persist_simulation(
        session=session,
        scenario_id="default_shift",
        strategy_type=StrategyType.ALWAYS_READY,
        scenario_overrides=overrides,
    )

    assert round(base_res.total_energy_kwh, 4) == round(whatif_res.total_energy_kwh, 4)
    # At double tariff (16 vs 8), cost should be double
    assert round(whatif_res.total_cost, 2) == round(base_res.total_cost * 2, 2)


def test_whatif_api_endpoint(client: TestClient):
    """Verify the /simulations/compare endpoint accepts scenario_overrides and returns calculated diffs."""
    response = client.post(
        "/api/v1/simulations/compare",
        json={
            "scenario_id": "default_shift",
            "fixed_timer_threshold_min": 25,
            "minimum_saving_kwh": 0.05,
            "allow_shutdown": False,
            "scenario_overrides": {
                "electricity_tariff_per_kwh": 10.0,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "comparison" in data
    assert data["comparison"]["production_preserved"] is True
