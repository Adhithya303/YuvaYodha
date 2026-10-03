"""Health and diagnostic status routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, text
from app.config import settings
from app.database import get_session, get_database_info

router = APIRouter(tags=["Health"])


@router.get("/health", status_code=status.HTTP_200_OK)
def check_health(session: Session = Depends(get_session)):
    """Health check verifying API responsiveness and SQLite database connectivity."""
    db_status = "connected"
    try:
        session.exec(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "degraded", "service": settings.APP_NAME, "database": db_status},
        )

    db_info = get_database_info()
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": db_status,
        "database_file": db_info.get("file_path"),
        "version": "0.1.0",
    }
