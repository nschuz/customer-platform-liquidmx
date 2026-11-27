"""X-Request-ID: every response carries one, taken from the request when the caller sent it."""

from fastapi.testclient import TestClient

HEADER = "X-Request-ID"


def test_every_response_carries_a_request_id(client: TestClient) -> None:
    response = client.get("/health")

    assert response.headers.get(HEADER)


def test_each_request_gets_its_own_request_id(client: TestClient) -> None:
    first = client.get("/health")
    second = client.get("/health")

    assert first.headers[HEADER] != second.headers[HEADER]


def test_a_request_id_sent_by_the_caller_is_echoed(client: TestClient) -> None:
    response = client.get("/health", headers={HEADER: "trace-abc-123"})

    assert response.headers[HEADER] == "trace-abc-123"


def test_error_responses_carry_the_request_id_too(client: TestClient) -> None:
    response = client.get("/nope", headers={HEADER: "trace-abc-123"})

    assert response.status_code == 404
    assert response.headers[HEADER] == "trace-abc-123"
