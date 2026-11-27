"""CORS: what a browser is allowed to call, driven by CORS_ORIGINS."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

DASHBOARD = "http://localhost:5173"
STAGING = "https://dashboard.example.com"
STRANGER = "https://stranger.example.com"


@pytest.fixture
def client() -> Generator[TestClient]:
    settings = Settings(_env_file=None, cors_origins=[DASHBOARD, STAGING])
    with TestClient(create_app(settings)) as client:
        yield client


def test_preflight_allows_the_methods_and_headers_the_api_uses(client: TestClient) -> None:
    """A browser asks before PATCHing with JSON; the answer must list PATCH and content-type."""
    response = client.options(
        "/customers",
        headers={
            "Origin": DASHBOARD,
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == DASHBOARD
    assert "PATCH" in response.headers["access-control-allow-methods"]


@pytest.mark.parametrize("origin", [DASHBOARD, STAGING])
def test_responses_carry_the_origin_that_was_configured(client: TestClient, origin: str) -> None:
    response = client.get("/health", headers={"Origin": origin})

    assert response.headers["access-control-allow-origin"] == origin


def test_a_browser_on_another_origin_gets_no_cors_headers(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": STRANGER})

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
