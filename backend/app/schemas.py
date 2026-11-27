"""Data transfer objects (Pydantic v2): what the API accepts and what it returns."""

import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints, field_validator


class HealthOut(BaseModel):
    """Body of `GET /health`, exactly `{"status": "ok"}`."""

    status: Literal["ok"] = "ok"


class CustomerStatus(StrEnum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    BLOCKED = "BLOCKED"


class CustomerCreate(BaseModel):
    """Body of `POST /customers`: only a name and an email."""

    model_config = ConfigDict(extra="ignore")

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        """One canonical form per address, so the unique constraint sees duplicates."""
        return value.strip().lower() if isinstance(value, str) else value


class CustomerStatusUpdate(BaseModel):
    """Body of `PATCH /customers/{customer_id}/status`. Unknown fields are ignored."""

    model_config = ConfigDict(extra="ignore")

    status: CustomerStatus


class CustomerOut(BaseModel):
    """A customer as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    status: CustomerStatus
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def as_utc(cls, value: object) -> object:
        """SQLite returns naive datetimes even for `DateTime(timezone=True)`."""
        if isinstance(value, datetime):
            return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
        return value


class ErrorDetail(BaseModel):
    """One invalid input field."""

    field: str
    message: str


class ErrorBody(BaseModel):
    """The `error` object every error response carries."""

    code: str
    message: str
    details: list[ErrorDetail] | None = None


class ErrorResponse(BaseModel):
    """Body of every error response."""

    error: ErrorBody
