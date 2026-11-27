"""Every error has the same envelope, whatever caused it: code, message, request id."""

import json
import logging
from typing import Any, cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.logging import ACCESS_LOGGER, JsonFormatter
from tests.factories import add_customer

HEADER = "X-Request-ID"
UNKNOWN_ID = "8f14e45f-ceea-467f-a8e0-9b1f2c3d4e5f"
ANA = {"name": "Ana Martínez", "email": "ana.martinez@example.com"}


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """The usual client, plus a route that fails the way a bug does: nobody handles it."""

    def crash() -> None:
        raise RuntimeError("secret internal detail: password=hunter2")

    app.add_api_route("/crash", crash)
    return TestClient(app)


def test_an_unknown_path_answers_404_in_the_error_envelope(client: TestClient) -> None:
    response = client.get("/nope", headers={HEADER: "trace-1"})

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "NOT_FOUND",
            "message": "The requested resource was not found.",
            "request_id": "trace-1",
        }
    }


def test_an_unsupported_method_answers_405_and_keeps_the_allow_header(client: TestClient) -> None:
    response = client.delete("/customers")

    assert response.status_code == 405
    assert response.json()["error"] == {
        "code": "METHOD_NOT_ALLOWED",
        "message": "Method not allowed.",
        "request_id": response.headers[HEADER],
    }
    # Raised by the router together with the `Allow` header; it lists the methods of the
    # first route that matches the path.
    assert "allow" in response.headers


def test_an_unhandled_error_answers_500_without_internal_details(client: TestClient) -> None:
    response = client.get("/crash", headers={"Origin": "http://localhost:5173"})

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Internal server error.",
            "request_id": response.headers[HEADER],
        }
    }
    assert response.headers[HEADER]  # generated: the caller sent none
    assert "secret" not in response.text
    assert "RuntimeError" not in response.text
    # A browser must be able to read it: the CORS headers are there like on any other response.
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_an_unhandled_error_is_logged_with_its_traceback(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """The caller gets a generic message; the operator gets everything needed to debug."""
    with caplog.at_level(logging.INFO, logger="app"):
        client.get("/crash", headers={HEADER: "trace-500"})

    lines = [json.loads(JsonFormatter().format(record)) for record in caplog.records]
    [error] = [line for line in lines if line["level"] == "ERROR"]
    assert error["logger"] == "app"
    assert "RuntimeError" in str(error["exception"])
    # The traceback must be findable by the id the caller was shown.
    assert error["request_id"] == "trace-500"
    [access] = [line for line in lines if line["logger"] == ACCESS_LOGGER]
    assert access["status_code"] == 500
    assert access["request_id"] == "trace-500"


@pytest.mark.parametrize(
    ("method", "path", "json", "status_code", "code"),
    [
        ("GET", "/nope", None, 404, "NOT_FOUND"),
        ("DELETE", "/customers", None, 405, "METHOD_NOT_ALLOWED"),
        ("GET", f"/customers/{UNKNOWN_ID}", None, 404, "CUSTOMER_NOT_FOUND"),
        ("GET", "/customers/not-a-uuid", None, 422, "VALIDATION_ERROR"),
        ("POST", "/customers", {"name": "Ana", "email": "nope"}, 422, "VALIDATION_ERROR"),
        ("POST", "/customers", ANA, 409, "EMAIL_ALREADY_EXISTS"),
        ("GET", "/crash", None, 500, "INTERNAL_SERVER_ERROR"),
    ],
    ids=[
        "unrouted",
        "wrong method",
        "missing customer",
        "bad id",
        "bad body",
        "duplicate",
        "crash",
    ],
)
def test_every_error_carries_the_request_id_of_its_response(
    client: TestClient,
    engine: Engine,
    method: str,
    path: str,
    json: dict[str, str] | None,
    status_code: int,
    code: str,
) -> None:
    add_customer(engine, ANA["name"], ANA["email"])

    response = client.request(method, path, json=json)

    error = cast(dict[str, Any], response.json()["error"])
    assert response.status_code == status_code
    assert error["code"] == code
    assert error["message"]
    assert error["request_id"] == response.headers[HEADER]
    assert set(error) <= {"code", "message", "request_id", "details"}


@pytest.mark.parametrize(
    ("path", "method", "error_codes"),
    [
        ("/customers", "post", [409, 422]),
        ("/customers", "get", [422]),
        ("/customers/{customer_id}", "get", [404, 422]),
        ("/customers/{customer_id}/status", "patch", [404, 422]),
    ],
)
def test_the_openapi_document_describes_errors_with_the_real_envelope(
    client: TestClient, path: str, method: str, error_codes: list[int]
) -> None:
    """A client generated from the document must expect the envelope the API answers with,
    not FastAPI's default `{"detail": [...]}`."""
    responses = client.get("/openapi.json").json()["paths"][path][method]["responses"]

    for code in error_codes:
        schema = responses[str(code)]["content"]["application/json"]["schema"]
        assert schema["$ref"] == "#/components/schemas/ErrorResponse"
