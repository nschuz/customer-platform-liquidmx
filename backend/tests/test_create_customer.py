"""POST /customers: creates a PENDING customer from just a name and an email."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, event

from tests.factories import add_customer


def test_create_returns_201_with_pending_status_and_utc_timestamp(client: TestClient) -> None:
    response = client.post(
        "/customers", json={"name": "Juan Pérez", "email": "juan.perez@example.com"}
    )

    assert response.status_code == 201
    body = response.json()
    assert list(body) == ["id", "name", "email", "status", "created_at"]
    assert uuid.UUID(body["id"]).version == 4
    assert body["name"] == "Juan Pérez"
    assert body["email"] == "juan.perez@example.com"
    assert body["status"] == "PENDING"
    assert body["created_at"].endswith("Z")


def test_create_strips_the_name_and_lowercases_the_email_before_saving(client: TestClient) -> None:
    response = client.post(
        "/customers", json={"name": "  Ana Martínez  ", "email": "  Ana.Martinez@Example.COM "}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ana Martínez"
    assert body["email"] == "ana.martinez@example.com"


def test_create_ignores_unknown_fields_and_always_starts_as_pending(client: TestClient) -> None:
    response = client.post(
        "/customers",
        json={
            "name": "Ana Martínez",
            "email": "ana.martinez@example.com",
            "status": "ACTIVE",
            "id": "00000000-0000-0000-0000-000000000000",
            "created_at": "2020-01-01T00:00:00Z",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "PENDING"
    assert body["id"] != "00000000-0000-0000-0000-000000000000"
    assert body["created_at"] != "2020-01-01T00:00:00Z"


@pytest.mark.parametrize(
    "second_email", ["juan.perez@example.com", "Juan.Perez@Example.com"], ids=["same", "other case"]
)
def test_create_rejects_an_email_that_already_exists(client: TestClient, second_email: str) -> None:
    first = client.post(
        "/customers", json={"name": "Juan Pérez", "email": "juan.perez@example.com"}
    )
    assert first.status_code == 201

    response = client.post("/customers", json={"name": "Juan Pérez", "email": second_email})

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "EMAIL_ALREADY_EXISTS",
            "message": "A customer with this email already exists.",
            "request_id": response.headers["X-Request-ID"],
        }
    }


def test_duplicate_detection_comes_from_the_database_constraint(
    client: TestClient, engine: Engine
) -> None:
    """The row appears behind the API's back, as a concurrent request would create it."""
    rejected: list[object] = []
    event.listen(
        engine, "handle_error", lambda context: rejected.append(context.original_exception)
    )
    add_customer(engine, "Existing", "juan.perez@example.com")

    response = client.post(
        "/customers", json={"name": "Juan Pérez", "email": "juan.perez@example.com"}
    )

    assert response.status_code == 409
    assert len(rejected) == 1  # the INSERT was attempted, and SQLite rejected it
    assert "customers.email" in str(rejected[0])


def test_create_accepts_a_name_of_exactly_120_characters(client: TestClient) -> None:
    response = client.post("/customers", json={"name": "x" * 120, "email": "ana@example.com"})

    assert response.status_code == 201


@pytest.mark.parametrize(
    ("payload", "invalid_fields"),
    [
        ({"name": "Ana", "email": "not-an-email"}, ["email"]),
        ({"name": "", "email": "ana@example.com"}, ["name"]),
        ({"name": "   ", "email": "ana@example.com"}, ["name"]),
        ({"name": "x" * 121, "email": "ana@example.com"}, ["name"]),
        ({"name": "Ana"}, ["email"]),
        ({"email": "ana@example.com"}, ["name"]),
        ({"name": 123, "email": ["a"]}, ["email", "name"]),
    ],
    ids=[
        "bad email",
        "empty name",
        "blank name",
        "long name",
        "no email",
        "no name",
        "wrong types",
    ],
)
def test_create_returns_422_naming_every_invalid_field(
    client: TestClient, payload: dict[str, object], invalid_fields: list[str]
) -> None:
    response = client.post("/customers", json=payload)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["message"] == "Invalid request."
    assert sorted(detail["field"] for detail in error["details"]) == invalid_fields
    assert all(
        isinstance(detail["message"], str) and detail["message"] for detail in error["details"]
    )


def test_create_returns_422_for_a_body_that_is_not_json(client: TestClient) -> None:
    response = client.post(
        "/customers", content="{not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 422
    assert [detail["field"] for detail in response.json()["error"]["details"]] == ["body"]
