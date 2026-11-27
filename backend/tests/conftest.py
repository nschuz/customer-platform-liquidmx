"""Shared fixtures: an isolated database and one application per test, no external services."""

import logging
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import db, models  # noqa: F401  (importing the models registers the tables)
from app.core.config import Settings
from app.db import Base, create_db_engine, get_session
from app.main import create_app

UVICORN_LOGGERS = ("uvicorn", "uvicorn.error", "uvicorn.access")
DASHBOARD_ORIGIN = "http://localhost:5173"  # the default of CORS_ORIGINS


@pytest.fixture(autouse=True)
def restore_logging() -> Generator[None]:
    """A test that starts the application configures logging process-wide: put it back."""
    root = logging.getLogger()
    uvicorn_loggers = [logging.getLogger(name) for name in UVICORN_LOGGERS]
    saved = (
        root.handlers[:],
        root.level,
        [(logger.handlers[:], logger.propagate, logger.disabled) for logger in uvicorn_loggers],
    )
    yield
    root.handlers[:], root.level = saved[0], saved[1]
    for logger, state in zip(uvicorn_loggers, saved[2], strict=True):
        logger.handlers[:], logger.propagate, logger.disabled = state


@pytest.fixture(autouse=True)
def guard_engine(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator[Engine]:
    """Safety net: no test may touch the development database. An application built without
    overriding `get_session` lands on this throwaway SQLite file, schema included."""
    engine = create_db_engine(f"sqlite:///{tmp_path / 'guard.db'}")
    Base.metadata.create_all(engine)
    monkeypatch.setattr(db, "engine", engine)
    yield engine
    engine.dispose()


@pytest.fixture
def engine() -> Generator[Engine]:
    """A private in-memory SQLite database with the schema created from the models."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def settings() -> Settings:
    """Settings fixed by the tests, whatever the environment or a `.env` file holds. Every
    value a test depends on is spelled out here; tests that need another one derive from it."""
    return Settings(_env_file=None, cors_origins=[DASHBOARD_ORIGIN], database_url="sqlite://")


@pytest.fixture
def app(settings: Settings, engine: Engine) -> FastAPI:
    """The application, wired to the test database with the settings above. Every request gets
    its own session, as in production, so a test can only observe what was really committed."""

    def test_session() -> Generator[Session]:
        with Session(engine) as session:
            yield session

    app = create_app(settings)
    app.dependency_overrides[get_session] = test_session
    return app


@pytest.fixture
def client(app: FastAPI) -> Generator[TestClient]:
    """HTTP client for `app`. Not used as a context manager: the lifespan (logging setup) has
    its own tests."""
    yield TestClient(app)
