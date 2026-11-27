"""Settings: how environment variables are read."""

import pytest

from app.core.config import Settings


def test_cors_origins_default_to_the_svelte_dev_server(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    settings = Settings(_env_file=None)

    assert settings.cors_origins == ["http://localhost:5173"]


def test_cors_origins_read_a_comma_separated_list(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173, https://dashboard.example.com")

    settings = Settings(_env_file=None)

    assert settings.cors_origins == ["http://localhost:5173", "https://dashboard.example.com"]


def test_cors_origins_accept_a_host_without_scheme(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deployment blueprints reference other services by bare host (Render's `fromService`)."""
    monkeypatch.setenv(
        "CORS_ORIGINS", "customer-platform-dashboard.onrender.com, http://localhost:5173"
    )

    settings = Settings(_env_file=None)

    assert settings.cors_origins == [
        "https://customer-platform-dashboard.onrender.com",
        "http://localhost:5173",
    ]
