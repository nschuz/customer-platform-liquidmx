"""Test data: customers inserted straight into the database, with full control over the values."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.models import Customer

NOW = datetime(2026, 11, 27, 12, 0, tzinfo=UTC)


def add_customer(
    engine: Engine,
    name: str,
    email: str,
    *,
    status: str = "PENDING",
    created_at: datetime = NOW,
    customer_id: uuid.UUID | None = None,
) -> Customer:
    """Insert one row through a session of its own, so no request session knows about it."""
    with Session(engine, expire_on_commit=False) as session:
        customer = Customer(
            id=customer_id, name=name, email=email, status=status, created_at=created_at
        )
        session.add(customer)
        session.commit()
        return customer


def stored_customer(engine: Engine, customer_id: uuid.UUID) -> Customer | None:
    """Read one row from the database, bypassing every session a request may have used."""
    with Session(engine) as session:
        return session.get(Customer, customer_id)
