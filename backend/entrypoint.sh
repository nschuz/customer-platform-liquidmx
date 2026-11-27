#!/bin/sh
# Container entrypoint: bring the schema up to date, seed the demo data unless told not to, and
# hand over to the command (uvicorn by default). The application itself never migrates or seeds.
set -eu

alembic upgrade head

if [ "${SEED_ON_STARTUP:-true}" = "false" ]; then
    echo "Seed skipped: SEED_ON_STARTUP=false."
else
    python -m scripts.seed
fi

exec "$@"
