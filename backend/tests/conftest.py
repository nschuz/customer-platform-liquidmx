"""Shared fixtures: one application and one client per test, no external services."""

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.db import create_db_engine
from app.main import create_app


@pytest.fixture
def client() -> Generator[TestClient]:
    """HTTP client talking to a freshly created application."""
    with TestClient(create_app()) as client:
        yield client


@pytest.fixture
def file_engine(tmp_path: Path) -> Generator[Engine]:
    """A real SQLite file database in a temporary directory: the production setup."""
    engine = create_db_engine(f"sqlite:///{tmp_path / 'test.db'}")
    yield engine
    engine.dispose()
