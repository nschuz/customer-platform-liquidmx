"""GET /customers/{customer_id}: one customer, 404 when missing, 422 for a malformed id."""

import uuid
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import Engine

from tests.factories import NOW, add_customer

CUSTOMER_ID = uuid.UUID("8f14e45f-ceea-467f-a8e0-9b1f2c3d4e5f")


def test_get_returns_the_customer(client: TestClient, engine: Engine) -> None:
    add_customer(
        engine,
        "Juan Pérez",
        "juan.perez@example.com",
        status="ACTIVE",
        created_at=NOW - timedelta(days=1),
        customer_id=CUSTOMER_ID,
    )

    response = client.get(f"/customers/{CUSTOMER_ID}")

    assert response.status_code == 200
    assert response.json() == {
        "id": "8f14e45f-ceea-467f-a8e0-9b1f2c3d4e5f",
        "name": "Juan Pérez",
        "email": "juan.perez@example.com",
        "status": "ACTIVE",
        "created_at": "2026-11-26T12:00:00Z",
    }


def test_get_returns_404_for_an_unknown_customer(client: TestClient) -> None:
    response = client.get("/customers/8f14e45f-ceea-467f-a8e0-9b1f2c3d4e5f")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "CUSTOMER_NOT_FOUND",
            "message": "Customer not found.",
            "request_id": response.headers["X-Request-ID"],
        }
    }


def test_get_returns_422_when_the_id_is_not_a_uuid(client: TestClient) -> None:
    response = client.get("/customers/not-a-uuid")

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert [detail["field"] for detail in error["details"]] == ["customer_id"]
