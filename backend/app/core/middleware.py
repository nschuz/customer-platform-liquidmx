"""Request id middleware: one id per request, echoed back and attached to everything it logs."""

import logging
import re
import time
import uuid

from starlette.datastructures import MutableHeaders
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.exceptions import internal_error_response
from app.core.logging import ACCESS_LOGGER

REQUEST_ID_HEADER = "x-request-id"
# A request id is a short, plain token. Anything else (whitespace, control characters, header
# syntax, huge values) would be written into a response header, an error body and the logs.
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,128}$")
logger = logging.getLogger(ACCESS_LOGGER)
error_logger = logging.getLogger("app")


def resolve_request_id(incoming: str | None) -> str:
    """The caller's id when it is well formed; a fresh one otherwise. A rejected value is never
    echoed."""
    if incoming and REQUEST_ID_PATTERN.fullmatch(incoming):
        return incoming
    return uuid.uuid4().hex


class RequestIdMiddleware:
    """Pure ASGI middleware. Per request it:

    * reuses the caller's `X-Request-ID` when it is well formed (`REQUEST_ID_PATTERN`) and
      generates one otherwise, returns it in the response and leaves it on `request.state` for
      the exception handlers;
    * answers errors that nobody handled with the generic 500 envelope;
    * writes one access log line.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        request_id = resolve_request_id(request.headers.get(REQUEST_ID_HEADER))
        request.state.request_id = request_id
        started = time.perf_counter()
        status_code = 500  # what a request ends up as when the application dies before answering
        response_started = False

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code, response_started
            if message["type"] == "http.response.start":
                status_code = message["status"]
                response_started = True
                MutableHeaders(scope=message).append(REQUEST_ID_HEADER, request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception:
            # Starlette answers errors that nobody handled from its outermost middleware, which
            # wraps every other one: that response would carry neither the request id nor the
            # CORS headers a browser needs to read it. So the answer is written here instead.
            if response_started:
                raise
            # With the request id: it is the only link between the traceback and what the
            # caller was told.
            error_logger.exception(
                "Unhandled exception", extra={"context": {"request_id": request_id}}
            )
            await internal_error_response(request)(scope, receive, send_with_request_id)
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
