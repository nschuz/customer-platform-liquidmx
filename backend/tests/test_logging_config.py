"""Logging setup: JSON lines on stdout, and uvicorn's own access log switched off."""

import json
import logging

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.logging import ACCESS_LOGGER, configure_logging
from app.main import create_app


def logged_names(capsys: pytest.CaptureFixture[str]) -> list[str]:
    """The `logger` of every JSON line written to stdout since the last read."""
    return [json.loads(line)["logger"] for line in capsys.readouterr().out.splitlines()]


def test_starting_the_app_configures_json_logging(
    capsys: pytest.CaptureFixture[str],
) -> None:
    """The server runs the lifespan at startup, after installing its own loggers: that is the
    moment to configure ours. Whatever is logged afterwards comes out as JSON."""
    with TestClient(create_app(Settings(_env_file=None))) as client:
        client.get("/health")

    names = logged_names(capsys)  # would raise on any line that is not JSON
    assert names.count(ACCESS_LOGGER) == 1


def test_uvicorn_access_log_is_switched_off(capsys: pytest.CaptureFixture[str]) -> None:
    """The middleware already writes one line per request; uvicorn's would be a second one."""
    configure_logging()
    logging.getLogger("uvicorn.access").info('127.0.0.1 - "GET /health HTTP/1.1" 200')
    logging.getLogger("uvicorn.error").info("Application startup complete.")

    assert logged_names(capsys) == ["uvicorn.error"]
