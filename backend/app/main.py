"""Application entry point: `uvicorn app.main:app`."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import customers, health
from app.core.config import Settings, get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestIdMiddleware


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Runs once per process when the server starts: logging is configured here, after uvicorn
    has installed its own loggers."""
    configure_logging()
    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the application: routers, middleware and exception handlers."""
    settings = settings or get_settings()
    app = FastAPI(title="Customer Management API", version="1.0.0", lifespan=lifespan)
    register_exception_handlers(app)
    # Added first, so it runs inside the CORS middleware: the generic 500 it writes for errors
    # nobody handled then carries the CORS headers a browser needs to read it.
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH"],
        # Listed to state the contract: Starlette safelists Content-Type anyway, so this line
        # alone changes nothing. What the CORS tests pin is that no other header gets through.
        allow_headers=["Content-Type"],
    )
    app.include_router(customers.router)
    app.include_router(health.router)
    return app


app = create_app()
