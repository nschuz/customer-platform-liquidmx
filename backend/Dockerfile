# Production image of the Customer Management API, in two stages: the first one builds the
# virtualenv with uv, the second one keeps only that virtualenv and the application code.

# ---- builder: the virtualenv ----
FROM python:3.12-slim AS builder

# Pinned to the uv release that uv.lock was generated with.
COPY --from=ghcr.io/astral-sh/uv:0.11.16 /uv /uvx /bin/

WORKDIR /app

# Dependencies first, copied from the manifests alone: the layer only changes when they do.
# The project itself is not installed: the application is imported from /app at runtime.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# ---- runtime ----
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Fixed uid well above the system range. /data holds the SQLite file: when Docker mounts an
# empty named volume on it, the volume inherits this ownership and the user can write to it.
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app \
    && mkdir /data \
    && chown app:app /data

COPY --from=builder /app/.venv ./.venv
COPY pyproject.toml alembic.ini entrypoint.sh ./
COPY app ./app
COPY alembic ./alembic
COPY scripts ./scripts

USER app

EXPOSE 8000

# Migrates and seeds before every start, then replaces itself with the command.
# Shell form so the command honours PORT: managed platforms (Render) inject it and route to it;
# anywhere else the fallback keeps port 8000, which is what Compose and the docs use.
ENTRYPOINT ["./entrypoint.sh"]
CMD uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
