"""Application entry point: `uvicorn app.main:app`."""

from fastapi import FastAPI

from app.api import health


def create_app() -> FastAPI:
    """Build the application: routers, middleware and exception handlers."""
    app = FastAPI(title="Customer Management API", version="1.0.0")
    app.include_router(health.router)
    return app


app = create_app()
