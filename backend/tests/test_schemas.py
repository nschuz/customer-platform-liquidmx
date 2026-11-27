"""DTO rules that the API tests cannot exercise on SQLite."""

import uuid
from datetime import datetime, timedelta, timezone

from app.models import Customer
from app.schemas import CustomerOut


def test_created_at_is_returned_in_utc_whatever_offset_it_was_read_with() -> None:
    """SQLite always hands back a naive datetime; another engine may hand back an offset."""
    stored = Customer(
        id=uuid.UUID("8f14e45f-ceea-467f-a8e0-9b1f2c3d4e5f"),
        name="Juan Pérez",
        email="juan.perez@example.com",
        status="ACTIVE",
        created_at=datetime(2026, 11, 27, 14, 0, tzinfo=timezone(timedelta(hours=2))),
    )

    body = CustomerOut.model_validate(stored).model_dump(mode="json")

    assert body["created_at"] == "2026-11-27T12:00:00Z"
