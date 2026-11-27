# Customer Management API

API REST de gestión de clientes: FastAPI, SQLAlchemy y SQLite, con el esquema gestionado por Alembic.
Es la mitad backend de `customer-platform` y funciona por sí sola.

## Requisitos

- Python 3.12 o superior.
- [uv](https://docs.astral.sh/uv/) (recomendado) o pip.

Todos los comandos de este README se ejecutan desde este directorio (`backend/`).

## Puesta en marcha

```bash
uv sync                               # entorno virtual y dependencias
cp .env.example .env                  # opcional: los valores por defecto ya funcionan
uv run alembic upgrade head           # crea el esquema en ./customers.db
uv run python -m scripts.seed         # opcional: 10 clientes de demostración
uv run uvicorn app.main:app --reload  # sirve en http://127.0.0.1:8000
```

Documentación interactiva (Swagger UI): <http://127.0.0.1:8000/docs>.
Esquema OpenAPI: <http://127.0.0.1:8000/openapi.json>.

Versiones instaladas al crear el proyecto (fijadas en `uv.lock`): FastAPI 0.165 (Starlette 1.10),
Pydantic 2.14, SQLAlchemy 2.1 con la API 2.0 (`Mapped` / `mapped_column`), Alembic 1.20.
Starlette 1.10 deprecated `httpx` en su `TestClient`, así que los tests usan `httpx2`.

### Con pip

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

## Endpoints

| Método y ruta | Qué hace | Éxito | Errores |
|---|---|---|---|
| `POST /customers` | Crea un cliente, siempre como `PENDING`. Solo acepta `name` y `email`; otros campos se ignoran. | `201` + cliente | `409` email duplicado · `422` validación |
| `GET /customers` | Lista clientes. Filtro opcional `?status=ACTIVE\|PENDING\|BLOCKED`. | `200` + array plano (`[]` si no hay datos), el más reciente primero | `422` estado inválido |
| `GET /customers/{customer_id}` | Devuelve un cliente. | `200` + cliente | `404` no existe · `422` id mal formado |
| `PATCH /customers/{customer_id}/status` | Cambia el estado. Idempotente. | `200` + cliente actualizado | `404` no existe · `422` estado inválido o id mal formado |
| `GET /health` | Liveness check: no toca la base de datos. | `200` con exactamente `{"status": "ok"}` | — |

El orden del listado es `created_at DESC` con `id` como desempate. Un cliente se serializa siempre
con las mismas claves: `id`, `name`, `email`, `status`, `created_at` (UTC, terminado en `Z`).

## Ejemplos con curl

Salidas reales de una ejecución con los datos de demostración cargados. El `id` y las fechas
cambian en cada ejecución.

```bash
URL=http://localhost:8000
```

Salud (liveness check, sin base de datos):

```bash
curl -s "$URL/health"
```

```
{"status":"ok"}
```

La cabecera `X-Request-ID`: se reutiliza la de la petición cuando es un identificador válido
(de 1 a 128 letras, dígitos, `.`, `_` o `-`, es decir `^[A-Za-z0-9._-]{1,128}$`):

```bash
curl -s -i -H "X-Request-ID: demo-123" "$URL/health"
```

```
HTTP/1.1 200 OK
date: Fri, 27 Nov 2026 18:52:43 GMT
server: uvicorn
content-length: 15
content-type: application/json
x-request-id: demo-123
vary: Origin

{"status":"ok"}
```

Si falta o no es válido, se genera una nueva y el valor recibido no se devuelve nunca (tampoco
aparece en los logs):

```bash
curl -s -i -H 'X-Request-ID: demo 123/abc' "$URL/health"
```

```
HTTP/1.1 200 OK
date: Fri, 27 Nov 2026 19:26:07 GMT
server: uvicorn
content-length: 15
content-type: application/json
x-request-id: c2e727f1b3f9429ba5bd4253ca4b913b
vary: Origin

{"status":"ok"}
```

Crear un cliente. El nombre se recorta y el email se guarda en minúsculas:

```bash
curl -s -i -X POST "$URL/customers" -H "Content-Type: application/json" \
    -d '{"name": "  Sofía Ortega  ", "email": "Sofia.Ortega@Example.com"}'
```

```
HTTP/1.1 201 Created
date: Fri, 27 Nov 2026 18:52:44 GMT
server: uvicorn
content-length: 165
content-type: application/json
x-request-id: 4ef80476d8594081b972a97b71bfce31
vary: Origin

{"id":"4e720f75-bb55-4db9-8743-704b9d6b34b4","name":"Sofía Ortega","email":"sofia.ortega@example.com","status":"PENDING","created_at":"2026-11-27T18:52:44.841679Z"}
```

Email duplicado (`409`), aunque cambie la mayúscula:

```bash
curl -s -i -X POST "$URL/customers" -H "Content-Type: application/json" \
    -d '{"name": "Sofía Ortega", "email": "sofia.ortega@example.com"}'
```

```
HTTP/1.1 409 Conflict
date: Fri, 27 Nov 2026 18:52:52 GMT
server: uvicorn
content-length: 144
content-type: application/json
x-request-id: 7c31e9dd3f6148abae1c497ae93d1e14
vary: Origin

{"error":{"code":"EMAIL_ALREADY_EXISTS","message":"A customer with this email already exists.","request_id":"7c31e9dd3f6148abae1c497ae93d1e14"}}
```

Validación (`422`): un detalle por campo inválido:

```bash
curl -s -w '\nHTTP %{http_code}\n' -X POST "$URL/customers" -H "Content-Type: application/json" \
    -d '{"name": "   ", "email": "no-es-un-email"}'
```

```
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request.","request_id":"82676666bd56491e8af79af88c0060a8","details":[{"field":"name","message":"String should have at least 1 character"},{"field":"email","message":"value is not a valid email address: An email address must have an @-sign."}]}}
HTTP 422
```

Listar filtrando por estado (el más reciente primero):

```bash
curl -s "$URL/customers?status=BLOCKED"
```

```
[{"id":"09d96930-0fd0-4d4e-bda1-89cae88b3bc2","name":"Carmen Ruiz","email":"carmen.ruiz@example.com","status":"BLOCKED","created_at":"2026-11-14T18:52:35.959373Z"},{"id":"ec0f6246-06f1-44c8-8863-c3017a7b1e9d","name":"Luis García","email":"luis.garcia@example.com","status":"BLOCKED","created_at":"2026-10-27T18:52:35.959373Z"}]
```

Estado inválido en el filtro (`422`):

```bash
curl -s -w '\nHTTP %{http_code}\n' "$URL/customers?status=active"
```

```
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request.","request_id":"563b25f36b734b25894d906d6a69325d","details":[{"field":"status","message":"Input should be 'ACTIVE', 'PENDING' or 'BLOCKED'"}]}}
HTTP 422
```

Obtener un cliente. `ID` es el `id` que devolvió el `POST`:

```bash
ID=4e720f75-bb55-4db9-8743-704b9d6b34b4
curl -s "$URL/customers/$ID"
```

```
{"id":"4e720f75-bb55-4db9-8743-704b9d6b34b4","name":"Sofía Ortega","email":"sofia.ortega@example.com","status":"PENDING","created_at":"2026-11-27T18:52:44.841679Z"}
```

Cliente inexistente (`404`):

```bash
curl -s -w '\nHTTP %{http_code}\n' "$URL/customers/00000000-0000-0000-0000-000000000000"
```

```
{"error":{"code":"CUSTOMER_NOT_FOUND","message":"Customer not found.","request_id":"11821adb781445dfa0e81b2dc4f8441a"}}
HTTP 404
```

`id` mal formado (`422`):

```bash
curl -s -w '\nHTTP %{http_code}\n' "$URL/customers/no-es-un-uuid"
```

```
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request.","request_id":"375b50e0789a4d279db879203bb23a70","details":[{"field":"customer_id","message":"Input should be a valid UUID, invalid character: found `n` at 0"}]}}
HTTP 422
```

Cambiar el estado. Repetir la misma petición devuelve lo mismo:

```bash
curl -s -X PATCH "$URL/customers/$ID/status" -H "Content-Type: application/json" \
    -d '{"status": "ACTIVE"}'
```

```
{"id":"4e720f75-bb55-4db9-8743-704b9d6b34b4","name":"Sofía Ortega","email":"sofia.ortega@example.com","status":"ACTIVE","created_at":"2026-11-27T18:52:44.841679Z"}
```

Método no soportado (`405`):

```bash
curl -s -i -X DELETE "$URL/customers/$ID"
```

```
HTTP/1.1 405 Method Not Allowed
date: Fri, 27 Nov 2026 18:52:58 GMT
server: uvicorn
content-length: 119
content-type: application/json
allow: GET
x-request-id: 8d32d186c56f4b91a05d876d424c7c1b
vary: Origin

{"error":{"code":"METHOD_NOT_ALLOWED","message":"Method not allowed.","request_id":"8d32d186c56f4b91a05d876d424c7c1b"}}
```

Ruta inexistente (`404`):

```bash
curl -s -w '\nHTTP %{http_code}\n' "$URL/no-existe"
```

```
{"error":{"code":"NOT_FOUND","message":"The requested resource was not found.","request_id":"90b9b97436374b8c9c4e006ba7b5193e"}}
HTTP 404
```

Preflight CORS desde el origen del frontend:

```bash
curl -s -i -X OPTIONS "$URL/customers/$ID/status" \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: PATCH" \
    -H "Access-Control-Request-Headers: content-type"
```

```
HTTP/1.1 200 OK
date: Fri, 27 Nov 2026 18:52:58 GMT
server: uvicorn
vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Request-Private-Network
access-control-allow-methods: GET, POST, PATCH
access-control-max-age: 600
access-control-allow-headers: Accept, Accept-Language, Content-Language, Content-Type
access-control-allow-origin: http://localhost:5173
content-length: 2
content-type: text/plain; charset=utf-8

OK
```

Una petición puede llevar `Content-Type` y las cabeceras que un navegador nunca somete a
preflight (`Accept`, `Accept-Language`, `Content-Language`). Cualquier otra se rechaza con
`400 Disallowed CORS headers`.

El listado completo, más reciente primero:

```bash
curl -s "$URL/customers" | python3 -c "import json,sys; [print(c['created_at'], c['status'], c['name']) for c in json.load(sys.stdin)]"
```

```
2026-11-27T18:52:44.841679Z ACTIVE Sofía Ortega
2026-11-26T18:52:35.959373Z PENDING Lucía Díaz
2026-11-20T18:52:35.959373Z ACTIVE Javier Moreno
2026-11-14T18:52:35.959373Z BLOCKED Carmen Ruiz
2026-11-08T18:52:35.959373Z PENDING Pedro Gómez
2026-11-02T18:52:35.959373Z ACTIVE Laura Sánchez
2026-10-27T18:52:35.959373Z BLOCKED Luis García
2026-10-21T18:52:35.959373Z ACTIVE Ana Martínez
2026-10-15T18:52:35.959373Z PENDING Carlos López
2026-10-09T18:52:35.959373Z ACTIVE María Fernández
2026-10-03T18:52:35.959373Z ACTIVE Juan Pérez
```

## Formato de error

Todas las respuestas de error usan un único formato:

```json
{"error": {"code": "…", "message": "…", "request_id": "…", "details": [{"field": "…", "message": "…"}]}}
```

`details` solo aparece en los `422`: un elemento `{field, message}` por campo inválido.
`request_id` es el mismo valor que la cabecera `X-Request-ID` de la respuesta.

| Código | HTTP | Cuándo |
|---|---|---|
| `CUSTOMER_NOT_FOUND` | 404 | El `id` no corresponde a un cliente. |
| `EMAIL_ALREADY_EXISTS` | 409 | El email ya está registrado; la comparación no distingue mayúsculas. |
| `VALIDATION_ERROR` | 422 | Cuerpo, query o path inválidos. |
| `NOT_FOUND` | 404 | Ruta inexistente. |
| `METHOD_NOT_ALLOWED` | 405 | Método no soportado en esa ruta. |
| `INTERNAL_SERVER_ERROR` | 500 | Error no controlado. La respuesta no expone nada interno; el traceback queda en el log. |

Única excepción: cuando el middleware CORS rechaza un preflight (origen no permitido), la
respuesta `400` la genera Starlette en texto plano, sin este formato y sin `request_id`. Un
navegador nunca se la muestra a la aplicación.

## Configuración

| Variable | Por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./customers.db` | URL de conexión de SQLAlchemy. Cambiarla permite usar otro motor (requiere instalar su driver). |
| `CORS_ORIGINS` | `http://localhost:5173` | Orígenes con permiso para llamar a la API desde un navegador, separados por comas. |

Se leen del entorno y, si existe, de un archivo `.env` en este directorio (ver `.env.example`).
El entorno tiene prioridad sobre el archivo.

El seed es solo un script: la aplicación no siembra datos al arrancar ni lee `SEED_ON_STARTUP`.
Esa variable corresponde al entrypoint del contenedor, que ejecuta las migraciones y el seed.

## Tests y calidad

```bash
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy app
```

- Los tests usan una base de datos propia por test (SQLite en memoria, esquema creado en un
  fixture) e inyectan la sesión con un override de dependencias. Ninguno toca `customers.db` ni
  necesita red, y pasan en cualquier orden.
- Tampoco dependen del entorno: la configuración que usan (`cors_origins`, `database_url`) la fija
  un fixture, así que variables como `CORS_ORIGINS` no cambian el resultado. La única excepción es
  un `DATABASE_URL` con un motor cuyo driver no esté instalado, que falla al importar la
  aplicación antes de llegar a los fixtures.
- Un test ejecuta la CLI real de Alembic sobre un archivo temporal y comprueba que el esquema
  migrado es el que declaran los modelos. Otro arranca la aplicación con sus dependencias reales
  sobre un archivo SQLite.
- `pytest` convierte cualquier warning en error.

## Arquitectura

Arquitectura en capas ligera con patrón Repository. Las capas son módulos:

```
app/
  main.py              # create_app(): routers, middleware, handlers; lifespan (logging)
  api/customers.py     # router fino: solo HTTP y dependencias
  api/health.py
  schemas.py           # DTOs de entrada y salida (Pydantic v2)
  services.py          # reglas de negocio; no importa FastAPI ni conoce códigos HTTP
  repositories.py      # Protocol CustomerRepository + SQLAlchemyCustomerRepository
  models.py            # ORM (SQLAlchemy 2.0: Mapped / mapped_column)
  db.py                # engine, sesión por petición, Base
  core/config.py       # pydantic-settings
  core/exceptions.py   # excepciones de dominio y su traducción a respuestas
  core/middleware.py   # X-Request-ID, una línea de log por petición, 500 genérico
  core/logging.py      # formatter JSON y configure_logging()
scripts/seed.py        # datos de demostración
alembic/               # env.py y la migración inicial
tests/
```

Una petición recorre router → servicio → repositorio:

1. El **router** valida la entrada con `schemas.py`, resuelve las dependencias y serializa con el
   DTO de salida.
2. El **servicio** (`CustomerService`) aplica las reglas: un cliente nuevo siempre es `PENDING`,
   y lo que no cumple una regla lanza una excepción de dominio (`EmailAlreadyExists`,
   `CustomerNotFound`). No sabe nada de HTTP. El `IntegrityError` que deja pasar el repositorio
   se convierte en `EmailAlreadyExists` sin mirar qué restricción lo provocó: hoy la única que
   puede rechazar el insert de un cliente válido es la de `UNIQUE` del email.
3. El **repositorio** guarda y consulta con SQLAlchemy, detrás de la interfaz `CustomerRepository`
   (un `Protocol`); la implementación de SQLAlchemy se inyecta con una dependencia de FastAPI.
   El contrato incluye los errores: `add` deja pasar `IntegrityError` cuando una restricción de la
   base de datos rechaza el insert.
4. `core/exceptions.py` traduce cada excepción a la respuesta con el formato de error único.

### Middleware

`RequestIdMiddleware` (ASGI puro) hace tres cosas por petición: reutilizar el `X-Request-ID` de la
petición cuando es un identificador válido (`^[A-Za-z0-9._-]{1,128}$`) o generar uno nuevo, y
devolverlo; escribir una línea de log JSON (método, ruta, estado, latencia en ms y `request_id`);
y responder un `500` genérico a los errores que nadie manejó, registrando su traceback con el
mismo `request_id`. Corre por dentro del middleware de CORS para que ese `500` lleve las cabeceras
CORS.

El logging se configura en el lifespan, una vez por proceso y después de que uvicorn configure
los suyos: un único handler JSON en el logger raíz y el access log de uvicorn desactivado, de
modo que cada petición se registra exactamente una vez. Los logs no contienen nombres ni emails:
solo método y ruta, nunca cuerpos, y el motor oculta los parámetros de las sentencias SQL.

## Migraciones

```bash
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe el cambio"
uv run alembic downgrade -1
```

`alembic/env.py` toma la URL de la configuración de la aplicación (no hay ninguna codificada) y
activa `render_as_batch`, que hace portables los `ALTER TABLE` a SQLite.

## Datos de demostración

`uv run python -m scripts.seed` inserta estos diez clientes, repartidos por los últimos 60 días:

| # | name | email | status |
|---|---|---|---|
| 1 | Juan Pérez | juan.perez@example.com | ACTIVE |
| 2 | María Fernández | maria.fernandez@example.com | ACTIVE |
| 3 | Carlos López | carlos.lopez@example.com | PENDING |
| 4 | Ana Martínez | ana.martinez@example.com | ACTIVE |
| 5 | Luis García | luis.garcia@example.com | BLOCKED |
| 6 | Laura Sánchez | laura.sanchez@example.com | ACTIVE |
| 7 | Pedro Gómez | pedro.gomez@example.com | PENDING |
| 8 | Carmen Ruiz | carmen.ruiz@example.com | BLOCKED |
| 9 | Javier Moreno | javier.moreno@example.com | ACTIVE |
| 10 | Lucía Díaz | lucia.diaz@example.com | PENDING |

Es idempotente por email: las filas que ya existen no se tocan y una segunda ejecución no crea
nada. Para trabajar con la lista vacía, no lo ejecutes (o borra `customers.db` y vuelve a migrar).

## Decisiones técnicas y trade-offs

- **Capas + Repository.** El servicio accede a la persistencia a través de la interfaz
  `CustomerRepository` y no conoce FastAPI ni códigos HTTP. No está aislado de SQLAlchemy: usa el
  modelo ORM `Customer` (no hay entidades de dominio separadas) e importa `IntegrityError`, la
  excepción con la que el repositorio avisa de que la base de datos rechazó un insert. Tampoco hay
  unit-of-work: para tres operaciones sería indirección sin beneficio.
- **El `409` sale de la base de datos.** No hay consulta previa de "¿existe este email?": dos
  peticiones concurrentes podrían pasarla. La restricción `UNIQUE` es la que decide, y el
  `IntegrityError` se traduce a `409`. Un test lo comprueba observando el error que emite SQLite.
  La traducción no distingue restricciones: cualquier `IntegrityError` del insert se responde
  como email duplicado, porque hoy esa es la única que puede violarse.
- **SQLite, portable por diseño.** Tipos portables (`Uuid`, `DateTime(timezone=True)`),
  migraciones en modo batch y la URL en configuración. Verificado con SQLite; PostgreSQL no se ha
  probado.
- **`created_at` en UTC en un solo sitio.** SQLite devuelve datetimes sin zona horaria aunque la
  columna sea `DateTime(timezone=True)`; el DTO de salida los normaliza.
- **Commit dentro de la petición.** Cada método del repositorio hace `commit`: así el
  `IntegrityError` se produce mientras la petición se está atendiendo y puede responderse `409`.
- **`500` en el middleware, no en un handler registrado.** Starlette atiende los errores no
  controlados en su middleware más externo, por fuera de CORS y del `X-Request-ID`: un navegador
  no podría leer esa respuesta. El middleware responde antes, y el traceback va al log.
- **Sin máquina de estados para `status`.** Cualquier estado válido puede asignarse, como pide el
  enunciado.

## Qué se verificó y qué no

Verificado, con la salida en el reporte de la tarea:

- `uv run pytest` (102 tests), `ruff check`, `ruff format --check` y `mypy app`.
- Base de datos desde cero: `alembic upgrade head`, el seed dos veces (la segunda no crea nada) y
  cada endpoint con `curl`, incluidos `409`, `404`, `422`, `405`, `/health`, el eco de
  `X-Request-ID` y el preflight CORS. Salidas en este README.
- Que el esquema migrado tiene un índice único en `customers.email` (con el módulo `sqlite3`).
- Que `uvicorn` escribe exactamente una línea JSON por petición, con y sin `--reload`.

No verificado:

- PostgreSQL (no había instancia disponible).
- Docker y `docker compose`: el `Dockerfile` y el compose se construyen en otra rama.
