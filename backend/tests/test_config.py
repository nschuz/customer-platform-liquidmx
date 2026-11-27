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
