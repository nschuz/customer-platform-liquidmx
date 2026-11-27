"""Idempotent seed of the demo customers: inserts the ones that are missing, by email.

Run from `backend/` once the schema exists: `uv run python -m scripts.seed`.
"""

from datetime import UTC, datetime, timedelta
from typing import NamedTuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import engine
from app.models import Customer


class SeedCustomer(NamedTuple):
    name: str
    email: str
    status: str
    days_ago: int  # how long ago the customer registered


# Oldest registration first, spread over the last 60 days, so the default listing order
# (newest first) is stable. The same table feeds the frontend's simulated API.
SEED_CUSTOMERS: tuple[SeedCustomer, ...] = (
    SeedCustomer("Juan Pérez", "juan.perez@liquidmx.com", "ACTIVE", days_ago=55),
    SeedCustomer("María Fernández", "maria.fernandez@liquidmx.com", "ACTIVE", days_ago=49),
    SeedCustomer("Carlos López", "carlos.lopez@liquidmx.com", "PENDING", days_ago=43),
    SeedCustomer("Ana Martínez", "ana.martinez@liquidmx.com", "ACTIVE", days_ago=37),
    SeedCustomer("Luis García", "luis.garcia@liquidmx.com", "BLOCKED", days_ago=31),
    SeedCustomer("Laura Sánchez", "laura.sanchez@liquidmx.com", "ACTIVE", days_ago=25),
    SeedCustomer("Pedro Gómez", "pedro.gomez@liquidmx.com", "PENDING", days_ago=19),
    SeedCustomer("Carmen Ruiz", "carmen.ruiz@liquidmx.com", "BLOCKED", days_ago=13),
    SeedCustomer("Javier Moreno", "javier.moreno@liquidmx.com", "ACTIVE", days_ago=7),
    SeedCustomer("Lucía Díaz", "lucia.diaz@liquidmx.com", "PENDING", days_ago=1),
)


def seed(session: Session, now: datetime) -> int:
    """Insert every seed customer whose email is not stored yet; existing rows are left as
    they are. Returns how many were created."""
    existing_emails = set(session.scalars(select(Customer.email)))
    created = 0
    for customer in SEED_CUSTOMERS:
        if customer.email in existing_emails:
            continue
        session.add(
            Customer(
                name=customer.name,
                email=customer.email,
                status=customer.status,
                created_at=now - timedelta(days=customer.days_ago),
            )
        )
        created += 1
    session.commit()
    return created


def main() -> None:
    """Entry point of `python -m scripts.seed`."""
    with Session(engine) as session:
        created = seed(session, datetime.now(UTC))
    print(f"Seed: {created} created, {len(SEED_CUSTOMERS) - created} already existed.")


if __name__ == "__main__":
    main()
