"""The session dependency: one session per request, bound to the configured engine."""

import pytest
from sqlalchemy import Engine, event

from app import db


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
