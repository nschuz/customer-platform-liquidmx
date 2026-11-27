"""Shared fixtures: an isolated database and one application per test, no external services."""

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registers the tables on the metadata)
from app.db import Base, create_db_engine, get_session
from app.main import create_app


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
def session(engine: Engine) -> Generator[Session]:
    """A session on the test database, shared with the application under test."""
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(session: Session) -> Generator[TestClient]:
    """HTTP client whose requests run on the test's isolated database session."""
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    with TestClient(app) as client:
        yield client


@pytest.fixture
def file_engine(tmp_path: Path) -> Generator[Engine]:
    """A real SQLite file database in a temporary directory: the production setup."""
    engine = create_db_engine(f"sqlite:///{tmp_path / 'test.db'}")
    yield engine
    engine.dispose()
