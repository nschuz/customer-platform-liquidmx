# Customer Platform

[![CI](https://github.com/nschuz/customer-platform-liquidmx/actions/workflows/ci.yml/badge.svg)](https://github.com/nschuz/customer-platform-liquidmx/actions/workflows/ci.yml)
[![Release](https://img.shields.io/badge/release-v1.1.0-blue)](CHANGELOG.md)

**Español** · [English below](#english)**

**Demo en vivo** (Render, plan gratuito — si estaba dormida, el primer golpe tarda ~30–60 s en
despertar):

- **Dashboard**: <https://customer-platform-dashboard.onrender.com>
- **API + Swagger interactivo**: <https://customer-platform-api.onrender.com/docs>

API para administrar clientes de una plataforma financiera y el dashboard que la consume. Un solo
repositorio con dos partes: el backend en **Python / FastAPI** y el frontend en
**SvelteKit / TypeScript**. Cada mitad funciona por sí sola y, usadas juntas, forman el flujo
completo.

Documentación adicional en [`docs/`](docs/): [arquitectura C4](docs/architecture/c4.md),
[diagramas de secuencia](docs/architecture/sequences.md), [modelo de datos](docs/data/model.md),
[OpenAPI exportada](docs/api/openapi.json) y una
[colección de Postman](docs/api/customer-platform.postman_collection.json) lista para importar.

| Parte      | Qué es                                                                  | Tecnología                                             |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `backend/` | Customer Management API: crear, listar, consultar y cambiar el estado   | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy, Alembic |
| `frontend/`| Customer Dashboard: tabla responsive, filtros, búsqueda y detalle       | SvelteKit, Svelte 5, TypeScript, Tailwind CSS 4         |
| raíz       | Imágenes Docker, Docker Compose, `Makefile` y el workflow de CI         | Docker, GitHub Actions                                 |

## Requisitos

- **Con Docker:** Docker con Compose v2. Nada más.
- **Sin Docker:** Python 3.12 o superior con [uv](https://docs.astral.sh/uv/) (o `pip`), Node.js
  22.22 o superior con npm, y GNU Make si quieres usar los atajos.

## Inicio rápido

### Con Docker (un comando)

```sh
docker compose up --build
```

La primera vez descarga las imágenes base y compila (unos minutos). Cuando los dos servicios
están sanos:

- Dashboard: <http://localhost:3000>
- API: <http://localhost:8000> · documentación interactiva: <http://localhost:8000/docs>

Al arrancar, el backend aplica las migraciones y crea 10 clientes de demostración (5 `ACTIVE`,
3 `PENDING`, 2 `BLOCKED`), así que el dashboard ya tiene datos. La base de datos vive en un volumen
con nombre: los cambios sobreviven a `docker compose restart` y a `docker compose down`.

```sh
docker compose down       # detiene y borra los contenedores; conserva la base de datos
docker compose down -v    # lo mismo y además borra la base de datos
```

Para empezar con la lista vacía hace falta un volumen nuevo: `SEED_ON_STARTUP=false` solo da una
lista vacía después de `docker compose down -v`.

Si en tu máquina los puertos 3000 o 8000 están ocupados, copia `.env.example` como `.env` y ajusta
`FRONTEND_PORT` y `BACKEND_PORT` (y con ellos `PUBLIC_API_URL` y `CORS_ORIGINS`). `.env.example`
explica cada variable.

### Sin Docker

Dos terminales. El backend:

```sh
cd backend
uv sync --frozen                      # o: pip install -e ".[dev]"
uv run alembic upgrade head           # crea la base de datos SQLite y el esquema
uv run python -m scripts.seed         # clientes de demostración (opcional, idempotente)
uv run uvicorn app.main:app --reload  # http://localhost:8000
```

El frontend:

```sh
cd frontend
npm ci
PUBLIC_API_URL=http://localhost:8000 npm run dev   # http://localhost:5173
```

Sin `PUBLIC_API_URL`, el frontend usa su **API simulada** y no necesita backend. Si Vite abre otro
puerto que no sea el 5173, arranca el backend con `CORS_ORIGINS=http://localhost:<puerto>`.

### Makefile

`make` o `make help` lista los atajos. Funcionan con GNU Make 3.81 en adelante.

| Target              | Qué hace                                                        |
| ------------------- | --------------------------------------------------------------- |
| `make up`           | Compila las imágenes y arranca los dos servicios en segundo plano, y muestra las URLs |
| `make down`         | Detiene los contenedores (conserva la base de datos)            |
| `make logs`         | Sigue los logs de los dos servicios                             |
| `make ps`           | Estado de los servicios                                         |
| `make install`      | Instala las dependencias de ambos (`uv sync --frozen`, `npm ci`) |
| `make dev-backend`  | Servidor de desarrollo del backend con recarga. La primera vez, después de `make install` y `make migrate` (y de `make seed` para tener datos) |
| `make dev-frontend` | Servidor de desarrollo del frontend                             |
| `make migrate`      | Aplica las migraciones a la base de datos local de `backend/`   |
| `make seed`         | Crea los clientes de demostración en la base de datos local     |
| `make test`         | Ejecuta las dos suites de tests                                 |
| `make lint`         | ruff (lint y formato), mypy y svelte-check                      |
| `make check`        | Todo lo que ejecuta el CI: lint, tests y build de producción    |

`make up` necesita un shell POSIX (`sh`, `sed`): en Windows, ejecútalo desde Git Bash o WSL.

## Arquitectura

```
                     navegador
                        │ HTTP + JSON
            ┌───────────┴────────────┐        ┌──────────────────────────────┐
            │ SvelteKit dashboard    │  sin   │ rutas /api/customers         │
            │ (SSR del armazón;      │ PUBLIC │ API simulada, en memoria     │
            │  datos cargados en     │ API_URL│ en el servidor del frontend  │
            │  el navegador)         ├────────┤                              │
            └───────────┬────────────┘        └──────────────────────────────┘
                        │ con PUBLIC_API_URL
                        ▼
            ┌──────────────────────────────────────────────┐
            │ FastAPI                                      │
            │  api/ ──► services ──► repositories (Protocol)│
            │  schemas · models · core (config, errores,   │
            │  request id, logging)                        │
            └─────────────────────────┬────────────────────┘
                                      ▼
                    SQLite + Alembic (DATABASE_URL permite PostgreSQL)
```

- **Backend, capas como módulos.** `api/` solo habla HTTP; `services.py` contiene la lógica de
  negocio y no importa FastAPI; `repositories.py` define la interfaz (`Protocol`) y su
  implementación con SQLAlchemy, que se inyecta por dependencia. `core/` reúne configuración,
  excepciones, middleware y logging.
- **Frontend.** El estado de servidor vive en `CustomersStore` (runes); la capa de servicio
  (`customerApi.ts`) resuelve la URL base en un único punto y convierte todo fallo en un `ApiError`.
- **Despliegue.** Dos imágenes multi-stage que corren con usuario non-root. El `entrypoint` del
  backend aplica las migraciones y el seed antes de arrancar uvicorn. El frontend es un servidor
  Node independiente (`adapter-node`).

```
.
├── backend/
│   ├── app/
│   │   ├── api/            # routers delgados: customers.py, health.py
│   │   ├── core/           # config, exceptions, middleware, logging
│   │   ├── db.py           # engine, sesión, Base
│   │   ├── models.py       # ORM (SQLAlchemy 2.0: Mapped / mapped_column)
│   │   ├── repositories.py # Protocol CustomerRepository + implementación
│   │   ├── schemas.py      # DTOs de entrada y salida (Pydantic v2)
│   │   ├── services.py     # lógica de negocio, sin HTTP
│   │   └── main.py         # create_app()
│   ├── alembic/            # migración inicial
│   ├── scripts/seed.py     # datos de demostración (idempotente)
│   ├── tests/              # pytest
│   ├── Dockerfile · entrypoint.sh
│   └── README.md
├── frontend/
│   ├── src/lib/
│   │   ├── components/     # StatusBadge, CustomerTable, CustomerCard, filtros, drawer…
│   │   ├── services/       # customerApi.ts: cliente HTTP tipado y ApiError
│   │   ├── server/         # API simulada (solo servidor)
│   │   ├── utils/          # búsqueda, fechas, foco, mensajes de error
│   │   ├── customers.svelte.ts
│   │   └── types/customer.ts
│   ├── src/routes/         # +page.svelte (dashboard) y api/customers/ (simulación)
│   ├── Dockerfile
│   └── README.md
├── .github/workflows/ci.yml
├── docker-compose.yml
├── Makefile
└── .env.example
```

## API

Las rutas se sirven en la raíz, sin prefijo.

| Método y ruta                          | Éxito                                  | Errores                                   |
| -------------------------------------- | -------------------------------------- | ----------------------------------------- |
| `POST /customers`                      | `201` cliente creado, siempre `PENDING` | `409` email duplicado · `422` validación  |
| `GET /customers?status=…`              | `200` array, más reciente primero      | `422` `status` inválido                   |
| `GET /customers/{customer_id}`         | `200` cliente                          | `404` no existe · `422` id mal formado    |
| `PATCH /customers/{customer_id}/status`| `200` cliente actualizado              | `404` no existe · `422` estado inválido   |
| `GET /health`                          | `200` `{"status": "ok"}`               | —                                         |

### Ejemplos con curl

Con el stack en marcha (API en `http://localhost:8000`). Lo mismo, listo para importar y ejecutar:
la [colección de Postman](docs/api/customer-platform.postman_collection.json) de `docs/api/`.

Health:

```sh
curl http://localhost:8000/health
{"status":"ok"}
```

Crear un cliente. El estado inicial siempre es `PENDING`:

```sh
curl -i -X POST http://localhost:8000/customers \
  -H 'Content-Type: application/json' \
  -d '{"name": "Sofía Navarro", "email": "sofia.navarro@example.com"}'
```

```
HTTP/1.1 201 Created
content-type: application/json
x-request-id: 0f085214f5a6459bba81dd025b15ec5c

{"id":"e56ec016-7746-4510-8295-d1af66714048","name":"Sofía Navarro","email":"sofia.navarro@example.com","status":"PENDING","created_at":"2026-11-27T20:54:40.569009Z"}
```

Email duplicado, aunque cambien las mayúsculas:

```sh
curl -w '\n%{http_code}\n' -X POST http://localhost:8000/customers \
  -H 'Content-Type: application/json' \
  -d '{"name": "Otra Sofía", "email": "SOFIA.NAVARRO@example.com"}'
{"error":{"code":"EMAIL_ALREADY_EXISTS","message":"A customer with this email already exists.","request_id":"9213566a5b1d48cbad7ed5f03272ee92"}}
409
```

Validación (email con formato inválido):

```sh
curl -X POST http://localhost:8000/customers \
  -H 'Content-Type: application/json' \
  -d '{"name": "X", "email": "not-an-email"}'
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request.","request_id":"dd889ac34b4b4e0aaa8be823722cbb3e","details":[{"field":"email","message":"value is not a valid email address: An email address must have an @-sign."}]}}
```

Listar con filtro (sin `?status=` devuelve todos):

```sh
curl 'http://localhost:8000/customers?status=BLOCKED'
[{"id":"966d1b18-e5ed-4e55-ac0d-84a9e2475440","name":"Carmen Ruiz","email":"carmen.ruiz@example.com","status":"BLOCKED","created_at":"2026-11-14T20:54:37.246901Z"},{"id":"78902d41-70b3-4ad4-ae69-5048cb2999c7","name":"Luis García","email":"luis.garcia@example.com","status":"BLOCKED","created_at":"2026-10-27T20:54:37.246901Z"}]

curl -o /dev/null -w '%{http_code}\n' 'http://localhost:8000/customers?status=NOPE'
422
```

Consultar uno:

```sh
ID=$(curl -s http://localhost:8000/customers \
  | python3 -c "import sys, json; print(next(c['id'] for c in json.load(sys.stdin) if c['name'] == 'Carlos López'))")
curl http://localhost:8000/customers/$ID
{"id":"36310aa0-bcc8-4668-8fcc-0969a389383a","name":"Carlos López","email":"carlos.lopez@example.com","status":"PENDING","created_at":"2026-10-15T20:54:37.246901Z"}

curl -w '\n%{http_code}\n' http://localhost:8000/customers/00000000-0000-0000-0000-000000000000
{"error":{"code":"CUSTOMER_NOT_FOUND","message":"Customer not found.","request_id":"1619697fe7c646fe8c4f7863a87737c9"}}
404
```

Cambiar el estado:

```sh
curl -w '\n%{http_code}\n' -X PATCH http://localhost:8000/customers/$ID/status \
  -H 'Content-Type: application/json' \
  -d '{"status": "ACTIVE"}'
{"id":"36310aa0-bcc8-4668-8fcc-0969a389383a","name":"Carlos López","email":"carlos.lopez@example.com","status":"ACTIVE","created_at":"2026-10-15T20:54:37.246901Z"}
200

curl -X PATCH http://localhost:8000/customers/$ID/status \
  -H 'Content-Type: application/json' \
  -d '{"status": "NOPE"}'
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request.","request_id":"7a87a7bd083a4f83a5363870b8368e4f","details":[{"field":"status","message":"Input should be 'ACTIVE', 'PENDING' or 'BLOCKED'"}]}}
```

El id de petición se reutiliza si llega en la cabecera:

```sh
curl -i http://localhost:8000/health -H 'X-Request-ID: demo-123'
HTTP/1.1 200 OK
content-type: application/json
x-request-id: demo-123

{"status":"ok"}
```

### Formato de error

Toda respuesta de error usa el mismo formato:

```json
{ "error": { "code": "…", "message": "…", "request_id": "…", "details": [ { "field": "…", "message": "…" } ] } }
```

`details` solo aparece en los `422`. Los códigos son `CUSTOMER_NOT_FOUND`, `EMAIL_ALREADY_EXISTS`,
`VALIDATION_ERROR`, `NOT_FOUND`, `METHOD_NOT_ALLOWED` y `INTERNAL_SERVER_ERROR`. Una excepción no
controlada devuelve el mismo formato sin filtrar detalles internos.

Cada respuesta lleva `X-Request-ID`: se reutiliza el de la petición si es válido y, si no, se
genera uno. Ese mismo id va en el cuerpo de los errores y en la línea de log de la petición, que es
JSON (método, ruta, código de estado, latencia en ms y request id). La única excepción son las
respuestas de las peticiones preflight de CORS, que contesta el propio middleware de CORS.

Más detalle y la explicación de cada decisión en [`backend/README.md`](backend/README.md).

## Frontend

Pantalla **Customer Dashboard**:

- Tabla a partir de 768 px y tarjetas por debajo, sin scroll horizontal.
- Filtro por estado con contadores (Todos, Activos, Pendientes, Bloqueados) y búsqueda por nombre o
  email en tiempo real, sin distinguir mayúsculas ni acentos.
- Un componente reutilizable `StatusBadge` con texto y color, y contraste suficiente.
- Estados de carga (esqueletos), de error (banner con **Reintentar**) y de lista vacía, con dos
  variantes: aún no hay clientes, y la búsqueda o el filtro no arrojan resultados.
- Botón **Ver detalle**: panel lateral accesible (cierre con `Esc`, clic fuera o botón; foco
  atrapado dentro y devuelto al botón que lo abrió) con todos los datos del cliente y un control
  para cambiar su estado.
- El pie de página indica la fuente de datos activa y la zona horaria de las fechas (UTC).

Modos de datos:

| Modo            | Cómo se activa                        | Qué pasa                                     |
| --------------- | ------------------------------------- | -------------------------------------------- |
| API simulada    | Sin `PUBLIC_API_URL` (por defecto)    | 10 clientes en memoria dentro de SvelteKit   |
| Backend real    | `PUBLIC_API_URL=http://localhost:8000`| El navegador llama a la API de FastAPI       |

Cómo ver cada estado de la interfaz, la estructura de `src/` y las decisiones del frontend en
[`frontend/README.md`](frontend/README.md).

## Calidad

```sh
make check
```

Ejecuta lo mismo que el CI:

|                   | Backend                          | Frontend                            |
| ----------------- | -------------------------------- | ----------------------------------- |
| Lint y formato    | `ruff check`, `ruff format --check` | —                                 |
| Tipos             | `mypy` (estricto, sobre `app`, `scripts`, `alembic` y `tests`) | `svelte-check` (0 errores, 0 avisos) |
| Tests             | `pytest`: 102 tests               | `vitest`: 177 tests en 19 archivos  |
| Build             | —                                | `vite build`                        |

Los tests del backend usan una base de datos aislada por test y cubren cada endpoint con sus casos
de error, la migración, el formato de error, el request id, los logs y el seed. Los del frontend
cubren la lógica pura, el cliente HTTP, la API simulada, el store y el comportamiento de los
componentes. El workflow `.github/workflows/ci.yml` corre todo esto en cada push a `main` y
`develop` y en cada pull request.

## Decisiones técnicas y trade-offs

- **Capas ligeras con patrón Repository, no Clean Architecture completa.** El servicio no conoce
  HTTP y depende de una interfaz, así que se prueba con fakes y se puede cambiar de ORM. Para una
  entidad no merecía use-cases ni entidades de dominio separadas: el costo de más capas sería
  leer tres archivos para seguir un flujo.
- **SQLite con Alembic, portable a PostgreSQL.** SQLite basta para esta aplicación y no exige
  servicio; los tipos son portables y la migración usa `render_as_batch`. `DATABASE_URL` permite
  cambiar de motor sin tocar código. PostgreSQL **no se probó** (ver "Qué se verificó").
- **El email duplicado lo decide la base de datos.** Hay una restricción `UNIQUE` y el `409` sale
  de capturar la `IntegrityError`: una consulta previa tendría una condición de carrera.
- **Un formato de error y un request id.** Un solo constructor de errores para todos los casos,
  incluidos los `422` de Pydantic, y un id que viaja del header al log: con él se encuentra la
  petición exacta en los logs. El `500` lo responde el middleware para no perder las cabeceras
  CORS ni el id. Los logs no registran datos personales.
- **API simulada por defecto, API real por variable de entorno.** El frontend se puede ejecutar,
  probar y demostrar sin backend, y conectarlo cuesta una variable. La URL se resuelve en un solo
  punto. El costo es mantener un segundo servidor que replica el contrato.
- **`PUBLIC_API_URL` es una variable de tiempo de ejecución.** El servidor de `adapter-node` la
  lee al arrancar, no al compilar, así que en Docker se pasa como variable del contenedor y
  cambiarla no requiere recompilar la imagen. Es una URL para el navegador (`localhost`, nunca el
  nombre del servicio).
- **Un solo patrón de estado: runes de Svelte 5.** Los datos del servidor en una clase con
  `$state`; lo que el usuario escribe y elige, en la página con `$state` y `$derived`.
- **Responsive con CSS, sin JavaScript de media queries.** Tabla y tarjetas existen en el DOM y se
  alternan con clases de Tailwind: no hay parpadeo al hidratar y la tabla no puede desbordar.
- **Búsqueda insensible a acentos y fechas en UTC.** `perez` encuentra a "Juan Pérez"; las fechas
  se muestran en una zona fija para que la lista no cambie según el navegador.
- **Cambio de estado no optimista.** La interfaz cambia con la respuesta del servidor: con un
  cliente en juego, esperar cuesta una petición y evita deshacer la interfaz si algo falla. Los
  errores se describen en español, porque los mensajes del servidor están en inglés: el cambio de
  estado va según su `code`, y el banner de carga abre con un mensaje propio que lleva detrás el
  texto del servidor cuando lo hay.
- **Versiones.** El backend usa las estables al momento de crearlo (FastAPI 0.165, SQLAlchemy 2.1,
  Pydantic 2.14, mypy 2.4). El scaffolding oficial de SvelteKit instaló SvelteKit 3 y Svelte 5.59,
  cuyas convenciones difieren de SvelteKit 2 (configuración en `vite.config.ts`, imports `#lib`,
  variables en `src/env.ts`); el frontend sigue a las instaladas y lo documenta en su README.
- **Imágenes y orquestación.** Multi-stage con usuario non-root, capa de dependencias cacheada,
  healthchecks sin `curl` y un volumen con nombre para SQLite. Compose levanta todo con un comando.

## Git Flow

El historial sigue Git Flow:

| Rama                     | Contenido                                                            |
| ------------------------ | -------------------------------------------------------------------- |
| `main`                   | Solo releases estables. Cada merge es un release etiquetado.         |
| `develop`                | Integración de las features.                                         |
| `feature/*`              | Una por unidad de trabajo, fusionadas en `develop` con `--no-ff`.    |
| `release/*`              | Preparación del release: documentación final y verificación; se fusiona en `main` con una etiqueta y vuelve a `develop`. |

Features de este release:

- `feature/backend-customer-api` — la API completa con sus tests.
- `feature/frontend-customer-dashboard` — el dashboard con su API simulada.
- `feature/infra-docker-compose` — imágenes, compose, `Makefile` y CI.
- `feature/frontend-status-update` — cambio de estado desde el detalle.

Para ver el flujo:

```sh
git log --graph --oneline --all
```

Los mensajes siguen Conventional Commits (`feat`, `fix`, `test`, `docs`, `build`, `ci`, `refactor`,
`chore`), con commits pequeños; en la rama del backend se comprobó además que cada commit pasa su
suite.

## Variables de entorno

Ninguna es un secreto y todas tienen un valor por defecto. Cada archivo documenta las suyas:

| Archivo                 | Variables                                                              |
| ----------------------- | ---------------------------------------------------------------------- |
| [`.env.example`](.env.example)                 | `BACKEND_PORT`, `FRONTEND_PORT`, `PUBLIC_API_URL`, `MOCK_EMPTY`, `CORS_ORIGINS`, `SEED_ON_STARTUP` (Compose) |
| [`backend/.env.example`](backend/.env.example) | `DATABASE_URL`, `CORS_ORIGINS`                                         |
| [`frontend/.env.example`](frontend/.env.example) | `PUBLIC_API_URL`, `MOCK_EMPTY`                                         |

## Despliegue en Render (gratuito)

El repositorio incluye un blueprint ([`render.yaml`](render.yaml)) que despliega los dos
servicios con las imágenes Docker del propio repo:

- **API**: `https://customer-platform-api.onrender.com` · Swagger interactivo en **`/docs`** y
  OpenAPI cruda en `/openapi.json`.
- **Dashboard**: `https://customer-platform-dashboard.onrender.com` (configurado para llamar a la
  API real).

Pasos (una sola vez, ~5 minutos):

1. Crea una cuenta gratuita en [render.com](https://render.com) (se puede entrar con GitHub).
2. New **+** → **Blueprint** → elige el repositorio. Render lee `render.yaml` y crea los dos
   servicios con sus variables ya resueltas (la URL de cada uno para el otro).
3. Espera a que ambos terminen el build (el primero tarda unos minutos). Listo.

Limitaciones del plan gratuito, por diseño: los servicios **duermen** tras ~15 min sin tráfico
(el primer golpe tarda 30–60 s en despertar) y **no hay disco persistente**, así que la base
SQLite se recrea y se siembra en cada despliegue (los clientes creados a mano se pierden). Para
una demo eso es suficiente; con disco de pago o PostgreSQL gestionado (`DATABASE_URL`) el resto
no cambia.

Notas técnicas: Render inyecta `PORT` y el contenedor del backend lo honora; los orígenes CORS
y `PUBLIC_API_URL` aceptan un host sin esquema porque el blueprint se pasa los hosts de cada
servicio (se asume `https://`).

## Qué se verificó y qué no

Verificado sobre el commit de este release:

- `make check` en verde: ruff, formato, mypy, svelte-check, 102 tests de backend, 177 de frontend y
  build de producción.
- `docker compose up --build` desde cero: los dos servicios llegan a `healthy`, ambos contenedores
  corren con un usuario distinto de root, la base de datos persiste entre reinicios, y un volumen
  nuevo con `SEED_ON_STARTUP=false` arranca con la lista vacía.
- Cada endpoint a través de los contenedores, con los casos de error (`409`, `404`, `422`) y el
  eco de `X-Request-ID`; una línea de log JSON por petición.
- El dashboard en un navegador contra el backend real: tabla, filtros, búsqueda, los dos estados
  vacíos, el estado de error con reintento, el panel de detalle (cierre, trampa de foco y retorno
  del foco) y el cambio de estado, incluido el caso en que el backend está detenido; a 375, 768 y
  1280 px.
- La instalación alternativa del backend con `pip install -e ".[dev]"` desde un entorno vacío.

No verificado:

- **PostgreSQL.** El código no tiene SQL específico de SQLite, pero solo se ejecutó con SQLite.
- **El workflow de CI en GitHub.** Se validó su sintaxis y las versiones de las acciones, pero no
  se ejecutó en GitHub.
- **Safari y Firefox.** La revisión en navegador se hizo con Chromium.
- **Otras arquitecturas.** Las imágenes se construyeron y probaron en `linux/arm64`.
- **Un puerto 3000 libre.** En la máquina donde se verificó estaba ocupado, así que el frontend se
  probó publicado en otro puerto (`FRONTEND_PORT`); el valor por defecto es 3000.

---

## English

**Live demo** (Render, free plan — if it was asleep, the first request takes ~30–60 s to wake):

- **Dashboard**: <https://customer-platform-dashboard.onrender.com>
- **API + interactive Swagger**: <https://customer-platform-api.onrender.com/docs>

API to manage customers of a financial platform, plus the dashboard that consumes it. One
repository, two halves: the backend in **Python / FastAPI** and the frontend in
**SvelteKit / TypeScript**. Each half works on its own; together they form the full flow.
(The Spanish section above is the primary, fully detailed version.)

| Part       | What it is                                                            | Stack                                                   |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| `backend/` | Customer Management API: create, list, get and change status          | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy, Alembic  |
| `frontend/`| Customer Dashboard: responsive table, filters, search, detail drawer  | SvelteKit, Svelte 5, TypeScript, Tailwind CSS 4          |
| root       | Docker images, Docker Compose, `Makefile` and the CI workflow         | Docker, GitHub Actions                                  |

More documentation in [`docs/`](docs/): [C4 architecture](docs/architecture/c4.md),
[sequence diagrams](docs/architecture/sequences.md), [data model](docs/data/model.md),
[exported OpenAPI](docs/api/openapi.json) and a
[ready-to-import Postman collection](docs/api/customer-platform.postman_collection.json).

### Requirements

- **With Docker:** Docker with Compose v2. Nothing else.
- **Without Docker:** Python 3.12+ with [uv](https://docs.astral.sh/uv/) (or `pip`), Node.js
  22.22+ with npm, and GNU Make for the shortcuts.

### Quick start

With Docker (one command):

```sh
docker compose up --build
```

On first run it downloads the base images and builds (a few minutes). Once both services are
healthy:

- Dashboard: <http://localhost:3000>
- API: <http://localhost:8000> · interactive docs: <http://localhost:8000/docs>

On startup the backend applies migrations and seeds 10 demo customers (5 `ACTIVE`, 3 `PENDING`,
2 `BLOCKED`), so the dashboard has data from the first second. The database lives in a named
volume: changes survive `docker compose restart` and `docker compose down`; `down -v` also
deletes the data. If ports 3000/8000 are taken on your machine, copy `.env.example` to `.env`
and adjust `FRONTEND_PORT`/`BACKEND_PORT` (and with them `PUBLIC_API_URL` and `CORS_ORIGINS`).
`SEED_ON_STARTUP=false` starts empty only with a fresh volume (`docker compose down -v` first).

Without Docker, two terminals:

```sh
# backend
cd backend
uv sync --frozen                      # or: pip install -e ".[dev]"
uv run alembic upgrade head
uv run python -m scripts.seed         # demo customers (optional, idempotent)
uv run uvicorn app.main:app --reload  # http://localhost:8000

# frontend
cd frontend
npm ci
PUBLIC_API_URL=http://localhost:8000 npm run dev   # http://localhost:5173
```

Without `PUBLIC_API_URL` the frontend uses its **built-in mock API** and needs no backend. Run
`make install` and `make migrate` before the first `make dev-backend`. `make` (or `make help`)
lists every shortcut; `make up` and the URL-printing targets need a POSIX shell (`sh`, `sed`) —
on Windows use Git Bash or WSL.

### API

Routes are served at the root, no prefix.

| Method and route                         | Success                                 | Errors                                     |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------ |
| `POST /customers`                        | `201` created, always `PENDING`          | `409` duplicate email · `422` validation   |
| `GET /customers?status=…`                | `200` array, newest first               | `422` invalid `status`                     |
| `GET /customers/{customer_id}`           | `200` customer                          | `404` not found · `422` malformed id       |
| `PATCH /customers/{customer_id}/status`  | `200` updated customer (idempotent)     | `404` not found · `422` invalid status     |
| `GET /health`                            | `200` `{"status": "ok"}`                | —                                          |

Every error response uses one envelope:

```json
{ "error": { "code": "…", "message": "…", "request_id": "…", "details": [ { "field": "…", "message": "…" } ] } }
```

`details` appears only on `422`s. Every response carries `X-Request-ID` (reused when valid,
generated otherwise), and each request logs exactly one JSON line (method, path, status, latency
in ms, request id) with no personal data. Full `curl` examples — captured from the running
stack — are in the [Spanish section](#ejemplos-con-curl); the
[Postman collection](docs/api/customer-platform.postman_collection.json) runs them for you.

### Frontend

The **Customer Dashboard**: table from 768 px and cards below (no horizontal scroll); status
filter pills with counts; real-time search over name/email, case- and accent-insensitive
(`perez` finds "Juan Pérez"); a reusable `StatusBadge` (text + colour, WCAG-compliant contrast);
skeleton loading, an error banner with **Retry** (in Spanish, mapped by error `code`), and two
empty states (no customers yet vs. no results); and an accessible detail drawer (Esc / backdrop /
button close, focus trapped and returned to its opener) that also changes the customer's status —
not optimistically, with `aria-live` feedback. The footer states the active data source and the
time zone of dates (UTC).

| Mode        | How it is activated                     | What happens                                   |
| ----------- | --------------------------------------- | ---------------------------------------------- |
| Mock API    | No `PUBLIC_API_URL` (default)           | 10 in-memory customers inside SvelteKit        |
| Real API    | `PUBLIC_API_URL=http://localhost:8000`  | The browser calls the FastAPI API directly     |

### Quality

`make check` runs what the CI runs: `ruff check` + `ruff format --check`, `mypy` over the whole
backend, `svelte-check` (0 errors / 0 warnings), 102 backend tests, 177 frontend tests in 19
files, and a production build. Backend tests use an isolated database per test and cover every
endpoint with its error cases, the migration, the error envelope, the request id, logging and the
seed. Frontend tests cover the pure logic, the HTTP client, the mock API, the store and component
behaviour. The workflow `.github/workflows/ci.yml` runs all of this on every push to `main` and
`develop` and on every pull request.

### Git Flow

`main` receives releases only (each merge is a tagged release: `v1.0.0`, `v1.1.0`, `v1.2.0`);
`develop` integrates; each unit of work lives on a `feature/*` branch merged with `--no-ff`;
`release/*` prepares each version. Conventional Commits throughout, with small commits; on the
backend branch every commit was additionally verified to pass its own suite. See the full graph
with `git log --graph --oneline --all`.

### Deploying to Render (free)

The repository ships a blueprint ([`render.yaml`](render.yaml)) that deploys both services from
the repo's own Docker images:

- **API**: `https://customer-platform-api.onrender.com` · interactive Swagger at **`/docs`** and
  the raw OpenAPI document at `/openapi.json`.
- **Dashboard**: `https://customer-platform-dashboard.onrender.com` (wired to call the real API).

Steps (once, ~5 minutes): create a free [render.com](https://render.com) account (GitHub login
works) → **New + → Blueprint** → pick this repository → wait for the builds. The blueprint
resolves each service's URL for the other.

Free-plan limits, by design: services **sleep** after ~15 min without traffic (first request
takes 30–60 s to wake) and there is **no persistent disk**, so SQLite is recreated and re-seeded
on every deploy (hand-created customers are lost). Fine for a demo; a paid disk or a managed
PostgreSQL (`DATABASE_URL`) changes nothing else.

Technical notes: Render injects `PORT` and the backend container honours it; CORS origins and
`PUBLIC_API_URL` accept a bare host because the blueprint passes each service's host that way
(`https://` is assumed).

### Verified / not verified

Verified on this release's commit: `make check` green; `docker compose up --build` from scratch
(both healthy, non-root users, data persists across restarts, fresh volume with
`SEED_ON_STARTUP=false` starts empty); every endpoint through the containers including error
cases; the dashboard in a browser against the real backend (list, filters, search, both empty
states, error + retry, drawer focus handling, status change including the failure path; at 375,
768 and 1280 px); the pip alternative (`pip install -e ".[dev]"`) from an empty environment.

Not verified: PostgreSQL (code is engine-agnostic, only SQLite was executed); the CI workflow on
GitHub (syntax and action versions validated only); Safari and Firefox (Chromium only);
architectures other than `linux/arm64`.
