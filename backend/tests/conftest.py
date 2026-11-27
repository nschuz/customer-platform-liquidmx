"""Shared fixtures: an isolated database and one application per test, no external services."""

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registers the tables on the metadata)
from app import db
from app.db import Base, create_db_engine, get_session
from app.main import create_app


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
def client(engine: Engine) -> Generator[TestClient]:
    """HTTP client on the test database. Every request gets its own session, as in production,
    so a test can only observe what was really committed."""

    def test_session() -> Generator[Session]:
        with Session(engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = test_session
    with TestClient(app) as client:
        yield client
