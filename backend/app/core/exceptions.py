"""Domain errors and how every error becomes an HTTP response."""

from collections.abc import Sequence
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas import ErrorBody, ErrorDetail, ErrorResponse


class DomainError(Exception):
    """Base of the errors the business rules raise. Each subclass says how HTTP answers it."""

    status_code: int
    code: str
    message: str


class EmailAlreadyExists(DomainError):
    status_code = 409
    code = "EMAIL_ALREADY_EXISTS"
    message = "A customer with this email already exists."


class CustomerNotFound(DomainError):
    status_code = 404
    code = "CUSTOMER_NOT_FOUND"
    message = "Customer not found."


def error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    *,
    details: list[ErrorDetail] | None = None,
) -> JSONResponse:
    """Every error of the API has this one shape, request id included."""
    error = ErrorBody(
        code=code, message=message, details=details, request_id=request.state.request_id
    )
    return JSONResponse(
        status_code=status_code, content=ErrorResponse(error=error).model_dump(exclude_none=True)
    )


def internal_error_response(request: Request) -> JSONResponse:
    """Deliberately generic: internals belong in the logs, not in a response."""
    return error_response(request, 500, "INTERNAL_SERVER_ERROR", "Internal server error.")


def field_path(location: Sequence[str | int]) -> str:
    """`("body", "email")` becomes `email`: where the value lives is dropped, the field kept."""
    return ".".join(str(part) for part in location[1:] if isinstance(part, str)) or str(location[0])


def handle_domain_error(request: Request, exc: Exception) -> JSONResponse:
    error = cast(DomainError, exc)
    return error_response(request, error.status_code, error.code, error.message)


def handle_validation_error(request: Request, exc: Exception) -> JSONResponse:
    validation = cast(RequestValidationError, exc)
    details = [
        ErrorDetail(field=field_path(error["loc"]), message=error["msg"])
        for error in cast(Sequence[dict[str, Any]], validation.errors())
    ]
    return error_response(request, 422, "VALIDATION_ERROR", "Invalid request.", details=details)


def handle_not_found(request: Request, exc: Exception) -> JSONResponse:
    return error_response(request, 404, "NOT_FOUND", "The requested resource was not found.")


def handle_method_not_allowed(request: Request, exc: Exception) -> JSONResponse:
    response = error_response(request, 405, "METHOD_NOT_ALLOWED", "Method not allowed.")
    # The router says which methods would work: keep its `Allow` header.
    response.headers.update(cast(StarletteHTTPException, exc).headers or {})
    return response


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, handle_domain_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    # The router raises these two itself, for an unknown path and an unsupported method.
    app.add_exception_handler(404, handle_not_found)
    app.add_exception_handler(405, handle_method_not_allowed)
