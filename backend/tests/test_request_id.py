"""X-Request-ID: every response carries one, well formed, and it is the same everywhere."""

import json
import logging

import pytest
from fastapi.testclient import TestClient

from app.core.logging import ACCESS_LOGGER, JsonFormatter
from app.core.middleware import resolve_request_id

HEADER = "X-Request-ID"
LOGGED_LINE = "not allowed / id"  # a rejected caller id: spaces and a slash

# What a caller may send: letters, digits, dot, underscore and hyphen, 1 to 128 of them.
WELL_FORMED_IDS = ["trace-abc-123", "A0", "with.dot_separated-and-hyphen", "a" * 128]
# What it may not: too long, or any other character. All of these the HTTP client can send.
MALFORMED_IDS = [
    pytest.param("a" * 129, id="too long"),
    pytest.param("", id="empty"),
    pytest.param("has space", id="space"),
    pytest.param("trace/123", id="slash"),
    pytest.param("a\nb", id="newline"),
    pytest.param("a\tb", id="tab"),
    pytest.param("a\x00b", id="nul"),
    pytest.param("a\x7fb", id="delete"),
    pytest.param("id=1; Path=/", id="header syntax"),
]


def test_every_response_carries_a_request_id(client: TestClient) -> None:
    response = client.get("/health")

    assert response.headers.get(HEADER)


def test_each_request_gets_its_own_request_id(client: TestClient) -> None:
    first = client.get("/health")
    second = client.get("/health")

    assert first.headers[HEADER] != second.headers[HEADER]


@pytest.mark.parametrize("incoming", WELL_FORMED_IDS)
def test_a_well_formed_request_id_is_reused(client: TestClient, incoming: str) -> None:
    response = client.get("/health", headers={HEADER: incoming})

    assert response.headers[HEADER] == incoming


@pytest.mark.parametrize("incoming", MALFORMED_IDS)
def test_a_malformed_request_id_is_replaced_by_a_generated_one(
    client: TestClient, incoming: str
) -> None:
    response = client.get("/health", headers={HEADER: incoming})

    generated = response.headers[HEADER]
    assert generated
    assert generated != incoming


@pytest.mark.parametrize("incoming", ["traza-ñ", "tra\u00e7o", "\u00fc" * 200])
def test_a_request_id_outside_ascii_is_replaced(incoming: str) -> None:
    """The HTTP client of the tests cannot send these; a real server can."""
    assert resolve_request_id(incoming) != incoming


def test_error_responses_carry_the_request_id_too(client: TestClient) -> None:
    response = client.get("/nope", headers={HEADER: "trace-abc-123"})

    assert response.status_code == 404
    assert response.headers[HEADER] == "trace-abc-123"


def test_the_generated_id_is_the_one_returned_logged_and_shown_in_errors(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """Whatever the caller sent, the header, the log line and the error body agree, and the
    rejected value reaches none of them."""
    with caplog.at_level(logging.INFO, logger="app"):
        response = client.get("/nope", headers={HEADER: LOGGED_LINE})

    generated = response.headers[HEADER]
    assert response.status_code == 404
    assert response.json()["error"]["request_id"] == generated
    lines = [JsonFormatter().format(record) for record in caplog.records]
    [access] = [json.loads(line) for line in lines if json.loads(line)["logger"] == ACCESS_LOGGER]
    assert access["request_id"] == generated
    assert all(LOGGED_LINE not in line for line in lines)
    assert LOGGED_LINE not in response.text
