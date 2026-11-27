"""Application settings, read from environment variables and an optional `.env` file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # `extra="ignore"`: the `.env` file may also hold variables of other tools.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./customers.db"


@lru_cache
def get_settings() -> Settings:
    """Settings are read once per process; environment parsing is not free."""
    return Settings()
