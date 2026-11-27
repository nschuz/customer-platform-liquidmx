# ADR-0002: SQLite con Alembic, portabilidad a PostgreSQL por configuración

- **Estado:** aceptada
- **Fecha:** 2026-11-27

## Contexto

El reto pide persistencia con migraciones y valora SQLAlchemy, Alembic y PostgreSQL. Ejecutar
PostgreSQL obligaría a levantar un servicio para un CRUD de una tabla; a la vez, "usar SQLite"
no debe significar SQL no portable ni esquemas sin migraciones.

## Decisión

SQLite por defecto (archivo local, o volumen de Docker en despliegue) con SQLAlchemy 2.0 y
Alembic desde el primer commit (migración inicial autogenerada y revisada a mano,
`render_as_batch=True`). El motor se elige con `DATABASE_URL`; los tipos y la generación de UUID
en la aplicación no dependen de funciones del motor.

## Consecuencias

- **Positivo:** `docker compose up` funciona sin servicio de base de datos; el esquema nace de
  migraciones, no de `create_all`; cambiar a PostgreSQL es una variable de entorno.
- **Negativo:** PostgreSQL **no se ha ejecutado**; `Uuid` se guarda como CHAR(32) en SQLite y una
  migración real a PostgreSQL debería convertir la columna. El `409` del email duplicado sí se
  apoya en la restricción `UNIQUE`, que ambos motores cumplen.
- **Alternativas descartadas:** PostgreSQL como requisito (fricción para el evaluador);
  `create_all` en el arranque (sin historial de migraciones, imposible de evolucionar).
