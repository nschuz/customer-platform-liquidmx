"""Persistence behind the `CustomerRepository` interface, which is all the service sees of
storage, except for the exception that the contract below lets through."""

import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Customer
from app.schemas import CustomerStatus


class CustomerRepository(Protocol):
    """What the service needs from storage (inversion of dependencies).

    Contract of `add`: it raises `sqlalchemy.exc.IntegrityError`, without catching it, when a
    database constraint rejects the insert. The service maps every `IntegrityError` to
    `EMAIL_ALREADY_EXISTS` without checking which constraint was violated. That is right today,
    because the unique constraint on `email` is the only one the insert of a valid customer can
    violate; any other (a primary-key collision, for example) would be reported the same way.
    """

    def add(self, customer: Customer) -> Customer: ...

    def get(self, customer_id: uuid.UUID) -> Customer | None: ...

    def list(self, status: CustomerStatus | None = None) -> list[Customer]: ...

    def save(self, customer: Customer) -> Customer: ...


class SQLAlchemyCustomerRepository:
    """`CustomerRepository` backed by a SQLAlchemy session."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, customer: Customer) -> Customer:
        """Raises `IntegrityError` when a constraint rejects the insert (the contract above)."""
        self.session.add(customer)
        self.session.commit()
        return customer

    def get(self, customer_id: uuid.UUID) -> Customer | None:
        return self.session.get(Customer, customer_id)

    def list(self, status: CustomerStatus | None = None) -> list[Customer]:
        """Newest first; the id breaks ties between identical timestamps."""
        statement = select(Customer).order_by(Customer.created_at.desc(), Customer.id.desc())
        if status is not None:
            statement = statement.where(Customer.status == status.value)
        return list(self.session.scalars(statement))

    def save(self, customer: Customer) -> Customer:
        self.session.commit()
        return customer
