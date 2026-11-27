"""PATCH /customers/{customer_id}/status: sets the status and returns the updated customer."""

import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from tests.factories import NOW, add_customer, stored_customer

CUSTOMER_ID = uuid.UUID("8f14e45f-ceea-467f-a8e0-9b1f2c3d4e5f")
CUSTOMER = {
    "id": "8f14e45f-ceea-467f-a8e0-9b1f2c3d4e5f",
    "name": "Carlos López",
    "email": "carlos.lopez@liquidmx.com",
    "created_at": "2026-11-26T12:00:00Z",
}


def add_pending_customer(engine: Engine) -> None:
    add_customer(
        engine,
        CUSTOMER["name"],
        CUSTOMER["email"],
        status="PENDING",
        created_at=NOW - timedelta(days=1),
        customer_id=CUSTOMER_ID,
    )


@pytest.mark.parametrize("status", ["ACTIVE", "PENDING", "BLOCKED"])
def test_update_returns_and_persists_the_new_status(
    client: TestClient, engine: Engine, status: str
) -> None:
    """Any valid status can be assigned; there is no state machine to satisfy."""
    add_pending_customer(engine)

    response = client.patch(f"/customers/{CUSTOMER_ID}/status", json={"status": status})

    assert response.status_code == 200
    assert response.json() == {**CUSTOMER, "status": status}
    stored = stored_customer(engine, CUSTOMER_ID)
    assert stored is not None
    assert stored.status == status


def test_update_only_changes_the_status(client: TestClient, engine: Engine) -> None:
    add_pending_customer(engine)

    response = client.patch(
        f"/customers/{CUSTOMER_ID}/status", json={"status": "BLOCKED", "name": "Renamed"}
    )

    assert response.status_code == 200
    assert response.json() == {**CUSTOMER, "status": "BLOCKED"}


def test_update_is_idempotent(client: TestClient, engine: Engine) -> None:
    add_pending_customer(engine)

    first = client.patch(f"/customers/{CUSTOMER_ID}/status", json={"status": "BLOCKED"})
    second = client.patch(f"/customers/{CUSTOMER_ID}/status", json={"status": "BLOCKED"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == first.json()


def test_update_returns_404_for_an_unknown_customer(client: TestClient) -> None:
    response = client.patch(
        "/customers/8f14e45f-ceea-467f-a8e0-9b1f2c3d4e5f/status", json={"status": "ACTIVE"}
    )

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "CUSTOMER_NOT_FOUND",
            "message": "Customer not found.",
            "request_id": response.headers["X-Request-ID"],
        }
    }


@pytest.mark.parametrize(
    "body",
    [{"status": "active"}, {"status": "DELETED"}, {}, {"status": None}, {"status": 1}],
    ids=["lowercase", "unknown", "missing", "null", "wrong type"],
)
def test_update_returns_422_for_an_invalid_status(client: TestClient, body: object) -> None:
    response = client.patch(f"/customers/{CUSTOMER_ID}/status", json=body)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert [detail["field"] for detail in error["details"]] == ["status"]


def test_update_returns_422_when_the_id_is_not_a_uuid(client: TestClient) -> None:
    response = client.patch("/customers/not-a-uuid/status", json={"status": "ACTIVE"})

    assert response.status_code == 422
    assert [detail["field"] for detail in response.json()["error"]["details"]] == ["customer_id"]
