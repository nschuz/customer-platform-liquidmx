"""Domain errors and how they become HTTP responses."""

from collections.abc import Sequence
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

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
    status_code: int, code: str, message: str, *, details: list[ErrorDetail] | None = None
) -> JSONResponse:
    """Every error of the API has this one shape."""
    body = ErrorResponse(error=ErrorBody(code=code, message=message, details=details))
    return JSONResponse(status_code=status_code, content=body.model_dump(exclude_none=True))


def field_path(location: Sequence[str | int]) -> str:
    """`("body", "email")` becomes `email`: where the value lives is dropped, the field kept."""
    return ".".join(str(part) for part in location[1:] if isinstance(part, str)) or str(location[0])


def handle_domain_error(request: Request, exc: Exception) -> JSONResponse:
    error = cast(DomainError, exc)
    return error_response(error.status_code, error.code, error.message)


def handle_validation_error(request: Request, exc: Exception) -> JSONResponse:
    validation = cast(RequestValidationError, exc)
    details = [
        ErrorDetail(field=field_path(error["loc"]), message=error["msg"])
        for error in cast(Sequence[dict[str, Any]], validation.errors())
    ]
    return error_response(422, "VALIDATION_ERROR", "Invalid request.", details=details)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, handle_domain_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
