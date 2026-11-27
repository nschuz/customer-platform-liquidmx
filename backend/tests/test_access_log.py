"""One JSON log line per request: method, path, status, latency, request id. Nothing personal."""

import json
import logging
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.logging import ACCESS_LOGGER, JsonFormatter

LINE_FIELDS = {
    "timestamp",
    "level",
    "logger",
    "message",
    "method",
    "path",
    "status_code",
    "duration_ms",
    "request_id",
}


def access_entries(caplog: pytest.LogCaptureFixture) -> list[dict[str, object]]:
    """The access records captured so far, formatted by the real formatter and parsed back."""
    formatter = JsonFormatter()
    return [
        json.loads(formatter.format(record))
        for record in caplog.records
        if record.name == ACCESS_LOGGER
    ]


def test_each_request_writes_exactly_one_line(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger=ACCESS_LOGGER):
        client.get("/health")
        client.get("/nope")

    assert len(access_entries(caplog)) == 2


def test_the_line_describes_the_request(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger=ACCESS_LOGGER):
        response = client.get("/health")

    [entry] = access_entries(caplog)
    assert set(entry) == LINE_FIELDS
    assert entry["logger"] == "app.access"
    assert entry["level"] == "INFO"
    assert entry["method"] == "GET"
    assert entry["path"] == "/health"
    assert entry["status_code"] == 200
    assert entry["request_id"] == response.headers["X-Request-ID"]
    duration = entry["duration_ms"]
    assert isinstance(duration, (int, float))
    assert duration >= 0
    timestamp = datetime.fromisoformat(str(entry["timestamp"]))
    assert timestamp.tzinfo is not None


def test_the_line_reports_the_status_that_was_answered(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger=ACCESS_LOGGER):
        client.post("/customers", json={"name": "", "email": "ana@liquidmx.com"})

    [entry] = access_entries(caplog)
    assert entry["method"] == "POST"
    assert entry["path"] == "/customers"
    assert entry["status_code"] == 422


def test_the_line_holds_no_personal_data(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """Names and emails travel in the body only; they must never reach the logs."""
    with caplog.at_level(logging.INFO, logger=ACCESS_LOGGER):
        client.post("/customers", json={"name": "Juan Pérez", "email": "juan.perez@liquidmx.com"})

    lines = [JsonFormatter().format(record) for record in caplog.records]
    assert any(json.loads(line)["logger"] == ACCESS_LOGGER for line in lines)
    for line in lines:
        assert "Juan" not in line
        assert "juan.perez@liquidmx.com" not in line
