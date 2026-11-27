"""Business rules. This module knows nothing about HTTP: it raises domain errors instead."""

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import EmailAlreadyExists
from app.models import Customer
from app.repositories import CustomerRepository
from app.schemas import CustomerStatus


class CustomerService:
    def __init__(self, repository: CustomerRepository) -> None:
        self.repository = repository

    def create_customer(self, name: str, email: str) -> Customer:
        """New customers always start as PENDING, whatever the caller sends."""
        customer = Customer(name=name, email=email, status=CustomerStatus.PENDING.value)
        # No "does it exist?" query first: it would race with a concurrent insert. The
        # database is the only one that can reject a duplicate for sure.
        try:
            return self.repository.add(customer)
        except IntegrityError as exc:
            raise EmailAlreadyExists from exc

    def list_customers(self, status: CustomerStatus | None = None) -> list[Customer]:
        return self.repository.list(status)
