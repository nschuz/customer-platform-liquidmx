"""Database engine, the per-request session dependency and the declarative base."""

from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session

from app.core.config import get_settings


class Base(DeclarativeBase):
    """Parent of every ORM model. Alembic reads the schema from `Base.metadata`."""


def create_db_engine(database_url: str) -> Engine:
    """Engine for a `DATABASE_URL`. Only SQLite needs extra connection arguments."""
    is_sqlite = make_url(database_url).get_backend_name() == "sqlite"
    # Sync endpoints run in a threadpool, so one session can be used from several threads.
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    # Parameters hold names and emails: keep them out of error messages, which get logged.
    return create_engine(database_url, connect_args=connect_args, hide_parameters=True)


engine = create_db_engine(get_settings().database_url)


def get_session() -> Generator[Session]:
    """FastAPI dependency: one session per request, closed when the request ends."""
    with Session(engine) as session:
        yield session
