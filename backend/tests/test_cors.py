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
    yield TestClient(create_app(settings))


PREFLIGHT = {
    "Origin": DASHBOARD,
    "Access-Control-Request-Method": "PATCH",
    "Access-Control-Request-Headers": "content-type",
}


def test_preflight_allows_the_methods_the_api_uses(client: TestClient) -> None:
    """A browser asks before PATCHing with JSON; the answer must list PATCH."""
    response = client.options("/customers", headers=PREFLIGHT)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == DASHBOARD
    assert "PATCH" in response.headers["access-control-allow-methods"]


def test_preflight_allows_content_type_the_header_a_json_body_needs(client: TestClient) -> None:
    """`Content-Type` is the one request header a JSON body needs. Starlette safelists it, so
    this holds with or without the configured list; the next test is the one that pins the
    configuration."""
    response = client.options("/customers", headers=PREFLIGHT)

    assert response.status_code == 200
    assert "content-type" in response.headers["access-control-allow-headers"].lower()


def test_preflight_rejects_any_other_request_header(client: TestClient) -> None:
    """The configured headers are the whole allowance. A wildcard there would make Starlette
    echo whatever the browser asks for instead of rejecting it."""
    response = client.options(
        "/customers",
        headers={**PREFLIGHT, "Access-Control-Request-Headers": "content-type, x-custom-header"},
    )

    assert response.status_code == 400
    assert response.text == "Disallowed CORS headers"
    assert "x-custom-header" not in response.headers.get("access-control-allow-headers", "")


@pytest.mark.parametrize("origin", [DASHBOARD, STAGING])
def test_responses_carry_the_origin_that_was_configured(client: TestClient, origin: str) -> None:
    response = client.get("/health", headers={"Origin": origin})

    assert response.headers["access-control-allow-origin"] == origin


def test_a_browser_on_another_origin_gets_no_cors_headers(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": STRANGER})

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
