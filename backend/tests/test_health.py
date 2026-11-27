"""GET /health: a liveness check with an exact body that never touches the database."""

from fastapi.testclient import TestClient

from app.db import get_session
from app.main import create_app


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_does_not_use_the_database() -> None:
    """Liveness must not depend on the database: no session may even be requested."""
    app = create_app()

    def no_database() -> None:
        raise AssertionError("GET /health must not request a database session")

    app.dependency_overrides[get_session] = no_database

    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
