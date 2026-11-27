"""The application with its real wiring: no dependency overrides, a SQLite file, real threads."""

from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.config import Settings
from app.main import create_app


def test_requests_are_served_through_the_real_session_dependency(
    settings: Settings, guard_engine: Engine
) -> None:
    """Covers what the override-based tests cannot: `get_session`, sync endpoints running in a
    threadpool and connections borrowed from the pool, on a database file like production.
    `guard_engine` is the database the application is wired to during tests."""
    client = TestClient(create_app(settings))
    created = client.post(
        "/customers", json={"name": "Juan Pérez", "email": "juan.perez@example.com"}
    )
    duplicate = client.post(
        "/customers", json={"name": "Juan Pérez", "email": "juan.perez@example.com"}
    )
    listed = client.get("/customers")
    fetched = client.get(f"/customers/{created.json()['id']}")
    updated = client.patch(f"/customers/{created.json()['id']}/status", json={"status": "ACTIVE"})

    assert created.status_code == 201
    assert duplicate.status_code == 409
    assert listed.json() == [created.json()]
    assert fetched.json() == created.json()
    assert updated.json() == {**created.json(), "status": "ACTIVE"}
