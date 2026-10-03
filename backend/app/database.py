"""Database connection, initialization, and session management."""

import os
from pathlib import Path
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine
from app.config import settings

# Parse SQLite file location to ensure parent directory exists
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///"):
    sqlite_path_str = db_url.replace("sqlite:///", "")
    # In Windows or Linux, resolve path
    db_file_path = Path(sqlite_path_str).resolve()
    db_file_path.parent.mkdir(parents=True, exist_ok=True)
    connect_args = {"check_same_thread": False}
else:
    db_file_path = None
    connect_args = {}

# Create SQLAlchemy/SQLModel engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)


def init_db() -> None:
    """Automatically create all tables if they do not exist."""
    # Ensure all models are imported so metadata knows about them
    import app.models  # noqa: F401

    if db_file_path:
        db_file_path.parent.mkdir(parents=True, exist_ok=True)

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding database session."""
    with Session(engine) as session:
        yield session


def get_database_info() -> dict:
    """Return database metadata for diagnostic endpoints."""
    return {
        "url": settings.DATABASE_URL,
        "is_sqlite": settings.DATABASE_URL.startswith("sqlite"),
        "file_path": str(db_file_path) if db_file_path else "remote",
        "exists": db_file_path.is_file() if db_file_path else True,
    }
