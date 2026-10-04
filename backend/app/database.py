"""Database connection, initialization, and session management."""

from pathlib import Path
from typing import Generator, Optional, Tuple
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.engine import Engine
from app.config import settings


def normalize_database_url(url: str) -> str:
    """Normalize standard postgresql:// URLs to postgresql+psycopg:// for SQLAlchemy/Psycopg 3.

    Leaves postgresql+psycopg://, sqlite://, and other URLs unchanged.
    """
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def create_database_engine(url: str, echo: bool = False) -> Tuple[Engine, Optional[Path]]:
    """Create SQLAlchemy/SQLModel engine based on the normalized database URL."""
    normalized_url = normalize_database_url(url)

    db_file_path: Optional[Path] = None
    if normalized_url.startswith("sqlite"):
        if normalized_url.startswith("sqlite:///"):
            sqlite_path_str = normalized_url.replace("sqlite:///", "")
            clean_path_str = sqlite_path_str.split("?")[0]
            if clean_path_str and clean_path_str != ":memory:":
                db_file_path = Path(clean_path_str).resolve()
                db_file_path.parent.mkdir(parents=True, exist_ok=True)

        connect_args = {"check_same_thread": False}
        engine = create_engine(
            normalized_url,
            echo=echo,
            connect_args=connect_args,
        )
    else:
        # Production / Remote PostgreSQL via Neon or standard PostgreSQL
        engine = create_engine(
            normalized_url,
            echo=echo,
            pool_pre_ping=True,
        )

    return engine, db_file_path


# Global engine instance configured from application settings
engine, db_file_path = create_database_engine(settings.DATABASE_URL)


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
    """Return database metadata for diagnostic endpoints without leaking credentials."""
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    dialect = "sqlite" if is_sqlite else "postgresql"
    return {
        "dialect": dialect,
        "is_sqlite": is_sqlite,
        "file_path": str(db_file_path) if db_file_path else "remote",
        "exists": db_file_path.is_file() if db_file_path else True,
    }
