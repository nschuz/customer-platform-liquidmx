"""Data transfer objects (Pydantic v2): what the API accepts and what it returns."""

from typing import Literal

from pydantic import BaseModel


class HealthOut(BaseModel):
    """Body of `GET /health`, exactly `{"status": "ok"}`."""

    status: Literal["ok"] = "ok"
