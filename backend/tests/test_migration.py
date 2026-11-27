"""The Alembic migration must build exactly the schema the models declare, and undo it."""

import os
import subprocess
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import Engine, create_engine, inspect

import app.models  # noqa: F401  (registers the tables on the metadata)
from app.db import Base

BACKEND_DIR = Path(__file__).resolve().parent.parent


def alembic(database: Path, *commands: str) -> None:
    """Run the real `alembic` command line against a temporary database."""
    result = subprocess.run(
        [sys.executable, "-m", "alembic", *commands],
        cwd=BACKEND_DIR,
        env={**os.environ, "DATABASE_URL": f"sqlite:///{database}"},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def schema_of(engine: Engine) -> dict[str, Any]:
    """Tables, columns, keys and unique constraints, leaving out database bookkeeping."""
    inspector = inspect(engine)
    return {
        table: {
            "columns": [
                (column["name"], str(column["type"]), column["nullable"])
                for column in inspector.get_columns(table)
            ],
            "primary_key": inspector.get_pk_constraint(table)["constrained_columns"],
            "unique": sorted(
                str(constraint["column_names"])
                for constraint in inspector.get_unique_constraints(table)
            ),
        }
        for table in sorted(inspector.get_table_names())
        if table != "alembic_version"
    }


def migrated_engine(tmp_path: Path) -> Engine:
    database = tmp_path / "migrated.db"
    alembic(database, "upgrade", "head")
    return create_engine(f"sqlite:///{database}")


def test_upgrade_head_builds_the_schema_declared_by_the_models(tmp_path: Path) -> None:
    migrated = migrated_engine(tmp_path)
    declared = create_engine("sqlite://")
    Base.metadata.create_all(declared)

    assert schema_of(migrated) == schema_of(declared)
    assert schema_of(migrated)["customers"]["unique"] == ["['email']"]


def test_downgrade_to_base_removes_the_schema(tmp_path: Path) -> None:
    database = tmp_path / "migrated.db"
    alembic(database, "upgrade", "head")
    alembic(database, "downgrade", "base")

    tables = inspect(create_engine(f"sqlite:///{database}")).get_table_names()

    # Alembic keeps its own bookkeeping table; every application table must be gone.
    assert [table for table in tables if table != "alembic_version"] == []
