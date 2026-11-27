# Customer platform: the Docker Compose stack and the local development tasks.
# Runs under GNU Make 3.81. `make` or `make help` lists the targets.

COMPOSE ?= docker compose

.DEFAULT_GOAL := help
.PHONY: help up down logs ps dev-backend dev-frontend install migrate seed test lint check

help: ## Show this help
	@awk '/^[a-zA-Z0-9_-]+:.*## / { split($$0, line, "## "); sub(/:.*/, "", line[1]); printf "  %-14s %s\n", line[1], line[2] }' $(MAKEFILE_LIST)

up: ## Build the images and start both services in the background
	@echo "+ $(COMPOSE) up --build -d"
	@$(COMPOSE) up --build -d
	@echo "Backend docs: http://localhost:$$($(COMPOSE) port backend 8000 | sed 's/.*://')/docs"
	@echo "Frontend:     http://localhost:$$($(COMPOSE) port frontend 3000 | sed 's/.*://')"

down: ## Stop and remove the containers (the database volume is kept)
	@echo "+ $(COMPOSE) down"
	@$(COMPOSE) down

logs: ## Follow the logs of both services
	@echo "+ $(COMPOSE) logs -f"
	@$(COMPOSE) logs -f

ps: ## Show the state of the services
	@echo "+ $(COMPOSE) ps"
	@$(COMPOSE) ps

dev-backend: ## Run the backend development server on http://localhost:8000
	@echo "+ cd backend && uv run uvicorn app.main:app --reload --port 8000"
	@cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend: ## Run the frontend development server (http://localhost:5173, or the next free port)
	@echo "+ cd frontend && npm run dev"
	@cd frontend && npm run dev

install: ## Install the dependencies of both apps (uv, npm)
	@echo "+ cd backend && uv sync --frozen"
	@cd backend && uv sync --frozen
	@echo "+ cd frontend && npm ci"
	@cd frontend && npm ci

migrate: ## Apply the migrations to the local database (backend/)
	@echo "+ cd backend && uv run alembic upgrade head"
	@cd backend && uv run alembic upgrade head

seed: ## Seed the local database (backend/)
	@echo "+ cd backend && uv run python -m scripts.seed"
	@cd backend && uv run python -m scripts.seed

test: ## Run the test suites (pytest, vitest)
	@echo "+ cd backend && uv run pytest"
	@cd backend && uv run pytest
	@echo "+ cd frontend && npm test"
	@cd frontend && npm test

lint: ## Lint and type-check (ruff, mypy, svelte-check)
	@echo "+ cd backend && uv run ruff check ."
	@cd backend && uv run ruff check .
	@echo "+ cd backend && uv run ruff format --check ."
	@cd backend && uv run ruff format --check .
	@echo "+ cd backend && uv run mypy"
	@cd backend && uv run mypy
	@echo "+ cd frontend && npm run check"
	@cd frontend && npm run check

check: lint test ## Run everything the CI runs: lint, tests and a production build
	@echo "+ cd frontend && npm run build"
	@cd frontend && npm run build
