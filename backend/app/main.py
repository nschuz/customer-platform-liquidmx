"""Application entry point: `uvicorn app.main:app`."""

from fastapi import FastAPI

from app.api import customers, health
from app.core.exceptions import register_exception_handlers


def create_app() -> FastAPI:
    """Build the application: routers, middleware and exception handlers."""
    app = FastAPI(title="Customer Management API", version="1.0.0")
    register_exception_handlers(app)
    app.include_router(customers.router)
    app.include_router(health.router)
    return app


app = create_app()
