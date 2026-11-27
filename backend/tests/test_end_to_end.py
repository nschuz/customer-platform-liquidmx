"""The application with its real wiring: no dependency overrides, a SQLite file, real threads."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.models  # noqa: F401  (registers the tables on the metadata)
from app import db
from app.db import Base, create_db_engine
from app.main import create_app


def test_requests_are_served_through_the_real_session_dependency(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Covers what the override-based tests cannot: `get_session`, sync endpoints running in a
    threadpool and connections borrowed from the pool, on a database file like production."""
    engine = create_db_engine(f"sqlite:///{tmp_path / 'api.db'}")
    Base.metadata.create_all(engine)
    monkeypatch.setattr(db, "engine", engine)

    with TestClient(create_app()) as client:
        created = client.post(
            "/customers", json={"name": "Juan Pérez", "email": "juan.perez@example.com"}
        )
        duplicate = client.post(
            "/customers", json={"name": "Juan Pérez", "email": "juan.perez@example.com"}
        )
        listed = client.get("/customers")

    engine.dispose()
    assert created.status_code == 201
    assert duplicate.status_code == 409
    assert listed.status_code == 200
    assert listed.json() == [created.json()]
