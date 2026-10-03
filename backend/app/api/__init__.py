"""API router aggregator."""

from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.machines import router as machines_router
from app.api.jobs import router as jobs_router
from app.api.simulations import router as simulations_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(machines_router)
api_router.include_router(jobs_router)
api_router.include_router(simulations_router)

__all__ = ["api_router"]
