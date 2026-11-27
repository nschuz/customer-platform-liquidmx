"""The session dependency: one session per request, bound to the configured engine."""

import pytest
from sqlalchemy import Engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import db
from app.models import Customer


def test_get_session_returns_its_connection_when_the_request_ends(guard_engine: Engine) -> None:
    """A session that is never closed would keep a pooled connection out of the pool."""
    in_use: list[object] = []  # DBAPI connections currently checked out of the pool
    event.listen(
        guard_engine, "checkout", lambda dbapi_connection, *_: in_use.append(dbapi_connection)
    )
    event.listen(
        guard_engine, "checkin", lambda dbapi_connection, *_: in_use.remove(dbapi_connection)
    )

    dependency = db.get_session()
    session = next(dependency)
    session.connection()  # the request starts using the database
    assert len(in_use) == 1

    with pytest.raises(StopIteration):
        next(dependency)  # the request ends

    assert in_use == []


def test_database_errors_do_not_expose_statement_parameters(guard_engine: Engine) -> None:
    """Exception text is what gets logged when a request fails. Statement parameters hold
    names and emails, so the engine must keep them out of it."""
    with Session(guard_engine) as session:
        session.add_all(
            [
                Customer(name="Juan Pérez", email="juan.perez@liquidmx.com", status="PENDING"),
                Customer(name="Juan Pérez", email="juan.perez@liquidmx.com", status="ACTIVE"),
            ]
        )
        with pytest.raises(IntegrityError) as failure:
            session.flush()

    assert "juan.perez@liquidmx.com" not in str(failure.value)
    assert "Juan Pérez" not in str(failure.value)
