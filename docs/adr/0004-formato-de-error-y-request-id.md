# ADR-0004: Formato de error unificado con `request_id` en toda la API

- **Estado:** aceptada
- **Fecha:** 2026-11-27

## Contexto

FastAPI devuelve por defecto un formato de validación propio (`detail`) y otro distinto para los
errores de ruta. En un contexto financiero, el consumidor necesita un único formato que pueda
programar y una forma de correlacionar un error visto en pantalla con la línea exacta del log.

## Decisión

Todas las respuestas de error usan el envelope
`{"error": {"code", "message", "request_id", "details"?}}`, incluidos los `422` de Pydantic, los
`404` de ruta, los `405` y los `500` (que nunca filtra detalles internos). Los códigos son
estables y en mayúsculas. Un middleware reutiliza o genera el `X-Request-ID` (validando el
entrante contra `^[A-Za-z0-9._-]{1,128}$`), lo devuelve en la respuesta y escribe una línea de
log JSON por petición (método, ruta, estado, latencia, request id) sin datos personales. El `500`
lo responde el middleware, dentro de CORS, para no perder ni las cabeceras CORS ni el id.

## Consecuencias

- **Positivo:** el consumidor programa contra un solo contrato; con el `request_id` se pasa del
  error en pantalla al log en un `grep`.
- **Negativo:** las respuestas que el propio middleware de CORS contesta (preflights) quedan
  fuera del envelope y sin id — reimplementar ese middleware no compensa. Las dos líneas de
  arranque de uvicorn tampoco son JSON.
- **Alternativas descartadas:** dejar los formatos por defecto (dos contratos de error);
  handler para `Exception` (correría fuera de CORS y sin id).
