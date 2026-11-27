"""Logging: every record becomes one JSON object per line."""

import json
import logging
import sys
from datetime import UTC, datetime

ACCESS_LOGGER = "app.access"


class JsonFormatter(logging.Formatter):
    """One JSON object per line. Whatever a logger passes as `extra={"context": {...}}` is
    merged into the object."""

    def format(self, record: logging.LogRecord) -> str:
        line: dict[str, object] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        line.update(getattr(record, "context", None) or {})
        if record.exc_info:
            line["exception"] = self.formatException(record.exc_info)
        return json.dumps(line, ensure_ascii=False)


def configure_logging() -> None:
    """A single JSON handler on the root logger. Called when the server starts, which is after
    uvicorn has configured its own loggers, so this configuration is the one that stays."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(logging.INFO)

    # uvicorn installs its own handlers and stops propagation: undo that, so its startup and
    # error messages go through the JSON handler as well.
    for name in ("uvicorn", "uvicorn.error"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers.clear()
        uvicorn_logger.propagate = True

    # uvicorn's access log would duplicate the line the request id middleware already writes.
    logging.getLogger("uvicorn.access").disabled = True
