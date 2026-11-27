"""Persistence behind a narrow interface, so the service does not depend on SQLAlchemy."""

from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Customer
from app.schemas import CustomerStatus


class CustomerRepository(Protocol):
    """What the service needs from storage (inversion of dependencies)."""

    def add(self, customer: Customer) -> Customer: ...

    def list(self, status: CustomerStatus | None = None) -> list[Customer]: ...


class SQLAlchemyCustomerRepository:
    """`CustomerRepository` backed by a SQLAlchemy session."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, customer: Customer) -> Customer:
        self.session.add(customer)
        self.session.commit()
        return customer

    def list(self, status: CustomerStatus | None = None) -> list[Customer]:
        """Newest first; the id breaks ties between identical timestamps."""
        statement = select(Customer).order_by(Customer.created_at.desc(), Customer.id.desc())
        if status is not None:
            statement = statement.where(Customer.status == status.value)
        return list(self.session.scalars(statement))
