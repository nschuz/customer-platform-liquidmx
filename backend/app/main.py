"""Application entry point: `uvicorn app.main:app`."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import customers, health
from app.core.config import Settings, get_settings
from app.core.exceptions import register_exception_handlers


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the application: routers, middleware and exception handlers."""
    settings = settings or get_settings()
    app = FastAPI(title="Customer Management API", version="1.0.0")
    register_exception_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Content-Type"],
    )
    app.include_router(customers.router)
    app.include_router(health.router)
    return app


app = create_app()
