"""Application settings, read from environment variables and an optional `.env` file."""

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    # `extra="ignore"`: the `.env` file may also hold variables of other tools.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./customers.db"
    # NoDecode: keep the raw text instead of letting pydantic-settings parse it as JSON.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        """`CORS_ORIGINS` is a comma-separated list in the environment.

        An entry without scheme is a bare host (deployment blueprints reference other services
        that way) and is taken as `https://`: every managed platform serves HTTPS.
        """
        if isinstance(value, str):
            return [
                origin if "://" in origin else f"https://{origin}"
                for origin in (part.strip() for part in value.split(","))
                if origin
            ]
        return value


@lru_cache
def get_settings() -> Settings:
    """Settings are read once per process; environment parsing is not free."""
    return Settings()
