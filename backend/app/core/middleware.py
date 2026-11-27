"""Request id middleware: one id per request, echoed back and attached to everything it logs."""

import logging
import time
import uuid

from starlette.datastructures import MutableHeaders
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import ACCESS_LOGGER

REQUEST_ID_HEADER = "x-request-id"
logger = logging.getLogger(ACCESS_LOGGER)


class RequestIdMiddleware:
    """Pure ASGI middleware: reuses the caller's `X-Request-ID` or generates one, returns it in
    the response, leaves it on `request.state` for the exception handlers and writes one access
    log line per request."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        request.state.request_id = request_id
        started = time.perf_counter()
        status_code = 500  # what a request ends up as when the application dies before answering

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message).append(REQUEST_ID_HEADER, request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            # Method and path only: names and emails travel in bodies, never in logs.
            logger.info(
                "%s %s %s",
                scope["method"],
                scope["path"],
                status_code,
                extra={
                    "context": {
                        "method": scope["method"],
                        "path": scope["path"],
                        "status_code": status_code,
                        "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                        "request_id": request_id,
                    }
                },
            )
