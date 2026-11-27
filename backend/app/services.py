"""Business rules. This module knows nothing about HTTP: it raises domain errors instead."""

import uuid

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import CustomerNotFound, EmailAlreadyExists
from app.models import Customer
from app.repositories import CustomerRepository
from app.schemas import CustomerStatus


class CustomerService:
    """The use cases. It knows no HTTP and reaches storage only through `CustomerRepository`,
    but it is not isolated from SQLAlchemy: it builds the ORM `Customer` and it imports the
    `IntegrityError` that the repository's `add` lets through."""

    def __init__(self, repository: CustomerRepository) -> None:
        self.repository = repository

    def create_customer(self, name: str, email: str) -> Customer:
        """New customers always start as PENDING, whatever the caller sends."""
        customer = Customer(name=name, email=email, status=CustomerStatus.PENDING.value)
        # No "does it exist?" query first: it would race with a concurrent insert. The
        # database is the only one that can reject a duplicate for sure. `add` lets the
        # IntegrityError through (see CustomerRepository), and every IntegrityError means a
        # duplicate email: that is the only constraint an insert of a valid customer can violate.
        try:
            return self.repository.add(customer)
        except IntegrityError as exc:
            raise EmailAlreadyExists from exc

    def get_customer(self, customer_id: uuid.UUID) -> Customer:
        return self._find(customer_id)

    def list_customers(self, status: CustomerStatus | None = None) -> list[Customer]:
        return self.repository.list(status)

    def update_status(self, customer_id: uuid.UUID, status: CustomerStatus) -> Customer:
        customer = self._find(customer_id)
        customer.status = status.value
        return self.repository.save(customer)

    def _find(self, customer_id: uuid.UUID) -> Customer:
        customer = self.repository.get(customer_id)
        if customer is None:
            raise CustomerNotFound
        return customer
