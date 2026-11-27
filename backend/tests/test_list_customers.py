"""GET /customers: a plain JSON array, newest first, optionally filtered by status."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Customer

NOW = datetime(2026, 11, 27, 12, 0, tzinfo=UTC)
LOW_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
HIGH_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


def add_customer(
    session: Session,
    name: str,
    email: str,
    *,
    status: str = "PENDING",
    created_at: datetime = NOW,
    customer_id: uuid.UUID | None = None,
) -> None:
    """Insert straight through the session, with full control over the stored values."""
    session.add(
        Customer(id=customer_id, name=name, email=email, status=status, created_at=created_at)
    )
    session.commit()


def test_list_returns_an_empty_array_when_there_are_no_customers(client: TestClient) -> None:
    response = client.get("/customers")

    assert response.status_code == 200
    assert response.json() == []


def test_list_returns_the_newest_customer_first(client: TestClient, session: Session) -> None:
    add_customer(
        session, "Ana Martínez", "ana.martinez@example.com", created_at=NOW - timedelta(days=3)
    )
    add_customer(
        session, "Juan Pérez", "juan.perez@example.com", created_at=NOW - timedelta(days=1)
    )
    add_customer(
        session, "Luis García", "luis.garcia@example.com", created_at=NOW - timedelta(days=2)
    )

    response = client.get("/customers")

    assert response.status_code == 200
    assert [customer["name"] for customer in response.json()] == [
        "Juan Pérez",
        "Luis García",
        "Ana Martínez",
    ]
    assert [customer["created_at"] for customer in response.json()] == [
        "2026-11-26T12:00:00Z",
        "2026-11-25T12:00:00Z",
        "2026-11-24T12:00:00Z",
    ]


def test_list_breaks_created_at_ties_by_id_descending(client: TestClient, session: Session) -> None:
    """Two customers created at the same instant still get a stable, defined order."""
    add_customer(
        session, "Ana Martínez", "ana.martinez@example.com", created_at=NOW, customer_id=LOW_ID
    )
    add_customer(
        session, "Juan Pérez", "juan.perez@example.com", created_at=NOW, customer_id=HIGH_ID
    )

    response = client.get("/customers")

    assert [customer["id"] for customer in response.json()] == [str(HIGH_ID), str(LOW_ID)]


@pytest.mark.parametrize(
    ("status", "expected_name"),
    [("ACTIVE", "Juan Pérez"), ("PENDING", "Ana Martínez"), ("BLOCKED", "Luis García")],
)
def test_list_filters_by_status(
    client: TestClient, session: Session, status: str, expected_name: str
) -> None:
    add_customer(session, "Juan Pérez", "juan.perez@example.com", status="ACTIVE")
    add_customer(session, "Ana Martínez", "ana.martinez@example.com", status="PENDING")
    add_customer(session, "Luis García", "luis.garcia@example.com", status="BLOCKED")

    response = client.get("/customers", params={"status": status})

    assert response.status_code == 200
    assert [customer["name"] for customer in response.json()] == [expected_name]


def test_list_returns_nothing_for_a_status_nobody_has(client: TestClient, session: Session) -> None:
    add_customer(session, "Juan Pérez", "juan.perez@example.com", status="ACTIVE")

    response = client.get("/customers", params={"status": "BLOCKED"})

    assert response.status_code == 200
    assert response.json() == []


def test_list_rejects_an_unknown_status_with_422(client: TestClient) -> None:
    response = client.get("/customers", params={"status": "active"})

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert [detail["field"] for detail in error["details"]] == ["status"]
