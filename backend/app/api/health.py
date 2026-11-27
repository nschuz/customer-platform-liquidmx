"""Liveness check. It takes no dependency on purpose: it must work without a database."""

from fastapi import APIRouter

from app.schemas import HealthOut

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> HealthOut:
    return HealthOut()
