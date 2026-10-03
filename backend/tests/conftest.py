"""Pytest fixtures with isolated in-memory SQLite database."""

import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app as fastapi_app
from app.database import get_session
import app.models  # noqa: F401


@pytest.fixture(name="session")
def session_fixture() -> Generator[Session, None, None]:
    """Create a fresh in-memory SQLite database for each test function."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
    """TestClient that overrides the get_session dependency with in-memory session."""

    def get_session_override():
        return session

    fastapi_app.dependency_overrides[get_session] = get_session_override
    with TestClient(fastapi_app) as client:
        yield client
    fastapi_app.dependency_overrides.clear()
