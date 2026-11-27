# Changelog

Todas las versiones notables de este proyecto se documentan aquí. El formato se basa en
[Keep a Changelog](https://keepachangelog.com/es-CH/1.1.0/) y el versionado en
[SemVer](https://semver.org/lang/es/).

## [1.2.0] — 2026-11-27

### Añadido

- Blueprint de Render (`render.yaml`) para desplegar los dos servicios con las imágenes Docker
  del repo en el plan gratuito, con las variables resueltas entre ellos.
- Sección de despliegue en Render (español e inglés) en el README: pasos, URLs y limitaciones
  del plan gratuito.

### Cambiado

- El contenedor del backend honora `PORT` (con fallback a 8000): las plataformas gestionadas
  como Render inyectan ese puerto y enrutan el tráfico a él.
- `CORS_ORIGINS` (backend) y `PUBLIC_API_URL` (frontend) aceptan un host sin esquema y asumen
  `https://`, que es como el blueprint de Render se pasa las URLs de cada servicio. Cubierto con
  tests en ambos lados (`test_config.py`, `env.test.ts`).

## [1.1.0] — 2026-11-27

### Añadido

- Documentación técnica en `docs/`: diagramas C4 (contexto y contenedores), diagramas de
  secuencia (crear cliente, cambiar estado, arranque del stack) y modelo de datos.
- Cinco registros de decisiones de arquitectura (ADR) sobre capas y Repository, SQLite con
  Alembic, el modo mock-primero del frontend, el formato de error unificado y Git Flow.
- `docs/api/openapi.json`: especificación OpenAPI 3.1 exportada de la aplicación.
- `docs/api/customer-platform.postman_collection.json`: colección de Postman (v2.1) con todos los
  endpoints, ejemplos de respuesta guardados (201, 200, 409, 404, 422), tests por petición y la
  variable `customer_id` que se guarda sola al crear un cliente.
- README bilingüe (español e inglés) con badge de CI y enlaces a la documentación.

## [1.0.0] — 2026-11-27

### Añadido

- **Backend** (`backend/`): Customer Management API con FastAPI, Pydantic v2 y SQLAlchemy.
  Endpoints `POST /customers`, `GET /customers` (filtro por estado), `GET /customers/{id}`,
  `PATCH /customers/{id}/status` y `GET /health`. Arquitectura en capas con patrón Repository,
  migración inicial de Alembic, envelope de error unificado con `request_id`, middleware de
  `X-Request-ID` con log JSON por petición, CORS por configuración, script de seed idempotente y
  102 tests (pytest). Calidad: ruff, mypy (estricto) y pip como alternativa a uv.
- **Frontend** (`frontend/`): Customer Dashboard con SvelteKit, Svelte 5 (runes) y Tailwind CSS 4.
  Tabla responsive (≥ 768 px) y tarjetas, filtro por estado con contadores, búsqueda sin acentos,
  esqueletos de carga, banner de error con reintento, dos estados vacíos, drawer accesible con
  trampa de foco y cambio de estado no optimista con feedback `aria-live`. API simulada incluida
  y API real vía `PUBLIC_API_URL` (variable de tiempo de ejecución). 177 tests (Vitest +
  Testing Library).
- **Infraestructura**: imágenes Docker multi-stage con usuario non-root y entrypoint que migra y
  siembra; `docker-compose.yml` con healthchecks y volumen persistente; `Makefile`; `.env.example`
  en la raíz; workflow de CI en GitHub Actions.
- READMEs por aplicación y README raíz con arquitectura, decisiones y ejemplos `curl` verificados.
