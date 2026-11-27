"""The Customer model: server-generated id and timestamp, unique email at the database level."""

from datetime import UTC, datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Customer


def test_new_customer_gets_its_id_and_created_at_from_the_server(session: Session) -> None:
    before = datetime.now(UTC)

    customer = Customer(name="Juan Pérez", email="juan.perez@example.com", status="PENDING")
    session.add(customer)
    session.flush()

    after = datetime.now(UTC)
    assert customer.id.version == 4
    assert customer.created_at.tzinfo == UTC
    assert before <= customer.created_at <= after


def test_email_is_unique_in_the_database(session: Session) -> None:
    """The constraint is the real duplicate check: a race can slip past any earlier query."""
    session.add_all(
        [
            Customer(name="Juan Pérez", email="juan.perez@example.com", status="PENDING"),
            Customer(name="Juan otra vez", email="juan.perez@example.com", status="ACTIVE"),
        ]
    )

    with pytest.raises(IntegrityError, match=r"customers\.email"):
        session.flush()
