"""Request id middleware: one id per request, echoed back and attached to everything it logs."""

import logging
import time
import uuid

from starlette.datastructures import MutableHeaders
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.exceptions import internal_error_response
from app.core.logging import ACCESS_LOGGER

REQUEST_ID_HEADER = "x-request-id"
logger = logging.getLogger(ACCESS_LOGGER)
error_logger = logging.getLogger("app")


class RequestIdMiddleware:
    """Pure ASGI middleware. Per request it:

    * reuses the caller's `X-Request-ID` or generates one, returns it in the response and
      leaves it on `request.state` for the exception handlers;
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
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
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
