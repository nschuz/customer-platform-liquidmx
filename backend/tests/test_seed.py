"""The seed: the ten demo customers, inserted once and never touched again."""

import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from app.models import Customer
from scripts import seed as seed_script
from scripts.seed import main, seed
from tests.factories import add_customer, stored_customer

NOW = datetime(2026, 11, 27, 12, 0, tzinfo=UTC)

# The demo customers, oldest registration first.
DEMO_CUSTOMERS = [
    ("Juan Pérez", "juan.perez@liquidmx.com", "ACTIVE"),
    ("María Fernández", "maria.fernandez@liquidmx.com", "ACTIVE"),
    ("Carlos López", "carlos.lopez@liquidmx.com", "PENDING"),
    ("Ana Martínez", "ana.martinez@liquidmx.com", "ACTIVE"),
    ("Luis García", "luis.garcia@liquidmx.com", "BLOCKED"),
    ("Laura Sánchez", "laura.sanchez@liquidmx.com", "ACTIVE"),
    ("Pedro Gómez", "pedro.gomez@liquidmx.com", "PENDING"),
    ("Carmen Ruiz", "carmen.ruiz@liquidmx.com", "BLOCKED"),
    ("Javier Moreno", "javier.moreno@liquidmx.com", "ACTIVE"),
    ("Lucía Díaz", "lucia.diaz@liquidmx.com", "PENDING"),
]
# Counted on a calendar: 55, 49, 43, ... 1 days before 2026-11-27 12:00 UTC.
REGISTRATION_TIMES = [
    "2026-10-03T12:00:00+00:00",
    "2026-10-09T12:00:00+00:00",
    "2026-10-15T12:00:00+00:00",
    "2026-10-21T12:00:00+00:00",
    "2026-10-27T12:00:00+00:00",
    "2026-11-02T12:00:00+00:00",
    "2026-11-08T12:00:00+00:00",
    "2026-11-14T12:00:00+00:00",
    "2026-11-20T12:00:00+00:00",
    "2026-11-26T12:00:00+00:00",
]


def stored_rows(engine: Engine) -> list[tuple[uuid.UUID, str, str, str, datetime]]:
    """Every customer, oldest registration first. SQLite hands `created_at` back naive: it is
    UTC by construction, so it is made explicit here."""
    statement = select(
        Customer.id, Customer.name, Customer.email, Customer.status, Customer.created_at
    ).order_by(Customer.created_at)
    with Session(engine) as session:
        return [
            (customer_id, name, email, status, created_at.replace(tzinfo=UTC))
            for customer_id, name, email, status, created_at in session.execute(statement)
        ]


def test_seed_inserts_the_ten_demo_customers(engine: Engine) -> None:
    with Session(engine) as session:
        created = seed(session, NOW)

    rows = stored_rows(engine)
    assert created == 10
    assert Counter(status for _, _, _, status, _ in rows) == {
        "ACTIVE": 5,
        "PENDING": 3,
        "BLOCKED": 2,
    }
    assert [(name, email, status) for _, name, email, status, _ in rows] == DEMO_CUSTOMERS


def test_seed_spreads_registrations_over_the_last_60_days(engine: Engine) -> None:
    with Session(engine) as session:
        seed(session, NOW)

    assert [created_at.isoformat() for *_, created_at in stored_rows(engine)] == (
        REGISTRATION_TIMES
    )


def test_seed_creates_nothing_and_changes_nothing_when_run_again(engine: Engine) -> None:
    with Session(engine) as session:
        seed(session, NOW)
    before = stored_rows(engine)

    with Session(engine) as session:
        created = seed(session, NOW + timedelta(days=30))  # the second run happens later

    assert created == 0
    assert stored_rows(engine) == before


def test_seed_only_adds_the_customers_that_are_missing(engine: Engine) -> None:
    """An existing row is left exactly as it is, even where it differs from the seed."""
    juan = add_customer(
        engine,
        "Juan Pérez",
        "juan.perez@liquidmx.com",
        status="BLOCKED",
        created_at=NOW - timedelta(days=4000),
    )

    with Session(engine) as session:
        created = seed(session, NOW)
        total = session.scalar(select(func.count()).select_from(Customer))

    juan_now = stored_customer(engine, juan.id)
    assert created == 9
    assert total == 10
    assert juan_now is not None
    assert juan_now.status == "BLOCKED"
    assert juan_now.created_at.replace(tzinfo=UTC) == juan.created_at


def test_main_prints_a_one_line_summary(
    engine: Engine, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(seed_script, "engine", engine)

    main()
    main()

    assert capsys.readouterr().out.splitlines() == [
        "Seed: 10 created, 0 already existed.",
        "Seed: 0 created, 10 already existed.",
    ]
