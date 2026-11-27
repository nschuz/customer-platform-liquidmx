# Customer Dashboard (frontend)

Dashboard de clientes hecho con SvelteKit, Svelte 5 y Tailwind CSS 4. Lista los clientes de la
plataforma, permite filtrarlos por estado, buscarlos por nombre o email, consultar el detalle de
cada uno en un panel lateral y cambiar su estado desde ahí.

Funciona por sí solo: sin configurar nada, usa una **API simulada** incluida en este proyecto. Es
la mitad de frontend de `customer-platform`; el backend (FastAPI) vive en `../backend`.

## Requisitos

- Node.js 22.22 o superior (lo exige `jsdom`, dependencia de pruebas) y npm.
- Para el modo con backend real, el backend en marcha y accesible desde el navegador.

## Ejecución

```sh
npm ci
npm run dev
```

La app queda en http://localhost:5173. Si ese puerto está ocupado, Vite usa el siguiente y lo
indica en la consola.

### Modo simulado (el predeterminado)

Sin `PUBLIC_API_URL`, la app llama a las rutas `/api/customers…` de su propio servidor. Esas rutas
sirven 10 clientes en memoria, con una latencia simulada de 300 a 600 ms para que el estado de
carga sea visible. Los datos vuelven a su estado inicial al reiniciar el servidor.

### Modo con backend real

Define `PUBLIC_API_URL` con la URL base del backend, en un archivo `.env` o al vuelo:

```sh
PUBLIC_API_URL=http://localhost:8000 npm run dev
```

El backend debe permitir el origen del frontend en su CORS. El pie de página indica la fuente de
datos activa: "API simulada" o el host configurado.

### Producción

```sh
npm run build
node build
```

`@sveltejs/adapter-node` genera un servidor Node independiente en `build/`. Las variables de
entorno se leen al arrancar ese servidor, no al compilar; el puerto se fija con `PORT`.

## Variables de entorno

| Variable           | Predeterminado | Descripción                                                                                          |
| ------------------ | -------------- | ---------------------------------------------------------------------------------------------------- |
| `PUBLIC_API_URL`   | vacía          | URL base del backend real. Vacía o sin definir: API simulada.                                         |
| `MOCK_EMPTY`       | `false`        | Con `true`, la API simulada arranca sin clientes (solo modo simulado).                                 |

`PUBLIC_API_URL` llega al navegador porque es pública. `.env.example` documenta ambas variables.

## Scripts

| Script           | Qué hace                                                        |
| ---------------- | --------------------------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo.                                         |
| `npm run build`   | Build de producción en `build/`.                                |
| `npm run preview` | Sirve el build de producción.                                   |
| `npm run check`   | `svelte-check`: tipos y accesibilidad de componentes.           |
| `npm run check:watch` | Lo mismo, observando cambios.                              |
| `npm test`        | `vitest run`: la suite de pruebas, una sola vez.                |
| `npm run test:watch` | La suite, observando cambios.                                |

## Estructura

```
src/
  env.ts                        # Variables de entorno declaradas (defineEnvVars)
  routes/
    +page.svelte                # El dashboard: estado de UI y composición
    layout.css                  # Paleta (@theme), anillo de foco y animación del drawer
    api/customers/…             # La API simulada (tres rutas +server.ts)
  lib/
    types/customer.ts           # CustomerStatus, Customer, DTOs y etiquetas de estado
    services/customerApi.ts     # Cliente HTTP tipado, ApiError y la URL base
    customers.svelte.ts         # Estado de servidor con runes (CustomersStore)
    utils/search.ts             # Búsqueda: normalización, filtro y contadores
    utils/formatters.ts         # formatDateTime
    utils/guards.ts             # asRecord: lee JSON sin tipos
    utils/messages.ts           # describeApiError, describeLoadError: cada error, en español
    utils/focus.ts              # Trampa de Tab y foco al primer botón visible
    components/                 # Un componente por pieza de la interfaz
    server/                     # Solo servidor: datos y reglas de la API simulada
```

Las pruebas viven junto al código que cubren (`*.test.ts`).

## Cómo ver cada estado

| Estado                | Cómo llegar                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| Carga                 | Recarga la página: esqueletos durante 300–600 ms.                            |
| Error                 | Arranca con `PUBLIC_API_URL` apuntando a un puerto sin nada escuchando.     |
| Sin clientes          | Arranca con `MOCK_EMPTY=true`.                                              |
| Sin resultados        | Escribe en el buscador algo que no coincida o combina filtro y búsqueda.    |
| Detalle               | Pulsa "Ver detalle" en una fila o en una tarjeta.                           |
| Cambio de estado      | Abre un cliente y elige otro estado en "Cambiar estado".                      |

A 375 px de ancho se ven tarjetas; a 768 px o más, la tabla.

## Cambiar el estado desde el detalle

El drawer incluye la sección **Cambiar estado**: tres botones (Activo, Pendiente, Bloqueado) con
`aria-pressed`. El estado actual queda marcado y no envía nada si se pulsa. Elegir otro envía
`PATCH /customers/{customer_id}/status` y, mientras espera, las tres opciones se deshabilitan y la
elegida muestra "Guardando…".

- **No es optimista.** La fila, los contadores y el drawer cambian solo cuando el servidor responde,
  con el cuerpo de esa respuesta. Si el cambio hace que el cliente deje de coincidir con el filtro
  activo, su fila sale de la lista y el drawer se queda abierto con los datos actualizados.
- **Feedback accesible.** Una región `aria-live="polite"` anuncia "Estado actualizado a …". Si
  falla, un `role="alert"` explica el error en español a partir del `code` del envelope: el mensaje
  del servidor real está en inglés y no se muestra tal cual. La lista no se toca.
- **Teclado.** Las opciones se alcanzan con Tab desde el botón de cerrar. El foco no sale del
  drawer ni siquiera cuando el botón pulsado se deshabilita, y al cerrar vuelve al botón de "Ver
  detalle" que lo abrió o, si esa fila ya no está, a la primera de la lista.

## Pruebas

`npm test` ejecuta Vitest con jsdom y Testing Library. Cubren la lógica pura (búsqueda, fechas,
guardas), el cliente HTTP (contratos, errores de red y timeout de 10 s), las rutas simuladas
(200, 201, 404, 409 y 422 con su envelope), el store y el comportamiento de los componentes
(etiquetas del badge, pills con `aria-pressed`, debounce de la búsqueda, cierre y foco del drawer,
cambio de estado con su estado pendiente y sus errores, trampa de Tab).

La configuración de Vitest está en `vitest.config.ts`, separada de la de Vite: allí Svelte se
resuelve con la condición `browser`, que no debe llegar al build de la app.

## Decisiones técnicas y trade-offs

- **API simulada por defecto.** El frontend se puede ejecutar, probar y demostrar sin el backend.
  La URL base se resuelve en un único punto (`customerApi.ts`): `PUBLIC_API_URL ?? '/api'`. El
  costo es mantener un segundo servidor que replica el contrato.
- **Un solo patrón de estado: runes.** Los datos del servidor viven en `CustomersStore`
  (`$state` en una clase); lo que el usuario escribe y elige vive en `+page.svelte` con `$state` y
  `$derived`. No hay stores de Svelte 4 ni `export let`. El store recibe el cliente HTTP por
  constructor, así que se prueba con funciones simples.
- **Responsive con CSS.** Desde 768 px se muestra una tabla con `table-layout: fixed` y anchos de
  columna en porcentaje, que no puede desbordar su contenedor; debajo, una lista de tarjetas. Ambas
  existen en el DOM y se alternan con `hidden`/`md:hidden`: sin JavaScript de media queries ni
  parpadeo al hidratar. Las fechas largas se recortan con puntos suspensivos; el valor completo
  está en el drawer.
- **Búsqueda insensible a mayúsculas y acentos.** El texto se descompone en NFD y se le quitan
  las marcas combinantes (`\p{M}`): `perez` encuentra a "Juan Pérez". Se descartó la propiedad
  Unicode `Diacritic` porque también elimina símbolos como `^`. Todo ocurre en el cliente, con
  200 ms de debounce.
- **Fechas en UTC.** `Intl.DateTimeFormat('es', …)` con zona horaria explícita y nombre de la zona
  al final (`27 nov 2026, 14:30 UTC`). Se eligió UTC para que la lista no cambie según la zona del
  navegador; el pie de página lo dice.
- **Errores centralizados.** Todo fallo del cliente HTTP es un `ApiError`: los errores del servidor
  se mapean desde su envelope y los fallos de red o timeout llevan `status: 0` con un mensaje en
  español. Las respuestas se validan con guardas de tipos antes de usarse.
- **Accesibilidad del drawer.** `role="dialog"`, `aria-modal`, fondo `inert`, foco atrapado con
  Tab y devuelto al botón que abrió el panel. La página guarda ese botón antes de volverse
  `inert`, porque el navegador quita el foco a lo que queda dentro de un subárbol inert.
- **Cambio de estado no optimista y errores por código.** Con un solo cliente en juego, esperar la
  respuesta cuesta una petición y evita tener que deshacer la interfaz si el servidor rechaza el
  cambio. Los errores se describen en el cliente a partir del `code` del envelope
  (`describeApiError`), porque el backend real responde en inglés y la API simulada en español.

## Versiones y convenciones

El scaffolding oficial (`npx sv create`) instaló versiones mayores cuyas convenciones difieren de
las de SvelteKit 2. El código sigue a las instaladas:

| Paquete     | Versión | Convención que cambia                                                         |
| ----------- | ------- | ----------------------------------------------------------------------------- |
| SvelteKit   | 3.4     | La configuración vive en `vite.config.ts`; `svelte.config.js` ya no se admite. |
| SvelteKit   | 3.4     | `#lib` (subpath imports de `package.json`) sustituye a `$lib`.                 |
| SvelteKit   | 3.4     | Las variables se declaran en `src/env.ts` y se leen de `$app/env/public` y `$app/env/private`. |
| Svelte      | 5.59    | Las props enlazables usan `$bindable()`; `$state.bindable()` se retiró.        |
| Tailwind    | 4.3     | CSS-first: `@theme` en `layout.css`, sin `tailwind.config.js`.                 |
| Vite        | 8.4     |                                                                               |
| TypeScript  | 6.0     |                                                                               |

Las importaciones de TypeScript a través de `#lib` llevan la extensión del archivo
(`#lib/types/customer.ts`); TypeScript y Vite las resuelven así.

## Contrato de la API simulada

Igual que el del backend: mismas claves (`id`, `name`, `email`, `status`, `created_at`) y errores
en `{ "error": { "code", "message", "request_id", "details"? } }`.

| Método y ruta                        | Éxito                      | Errores                                              |
| ------------------------------------ | -------------------------- | ---------------------------------------------------- |
| `GET /customers`                     | `200` array, más nuevo primero | `422` `?status=` inválido (`VALIDATION_ERROR`)  |
| `POST /customers`                    | `201`, siempre `PENDING`   | `409` email duplicado · `422` datos inválidos        |
| `GET /customers/{customer_id}`       | `200`                      | `404` no existe · `422` id mal formado               |
| `PATCH /customers/{customer_id}/status` | `200`, idempotente      | `404` no existe · `422` status o id inválidos        |
