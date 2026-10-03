"""IdleWise FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import init_db
from app.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for database initialization on startup."""
    # Automatically initialize SQLite database and create tables
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Energy-Aware Machine Idle-State Decision Simulation API for Manufacturing SMEs. "
        "NOTICE: This prototype uses synthetic simulation data and does not control real industrial equipment."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Global exception handler to avoid exposing raw stack traces in responses."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "InternalServerError", "message": "An unexpected server error occurred."},
    )


# Mount API V1 routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    """Root info endpoint."""
    return {
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "disclaimer": "Simulated machine data only. Does not control real industrial machinery.",
        "api_v1": settings.API_V1_PREFIX,
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
