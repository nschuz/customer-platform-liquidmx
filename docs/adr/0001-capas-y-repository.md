# ADR-0001: Arquitectura en capas ligeras con patrón Repository

- **Estado:** aceptada
- **Fecha:** 2026-11-27

## Contexto

La API debe crear, listar, consultar y actualizar clientes, con validación, errores claros y
tests. El enunciado valora "separación de responsabilidades". Un backend de una sola entidad
puede caer en dos extremos: todo en el router, o una Clean Architecture completa con use-cases,
entidades de dominio y mapeadores.

## Decisión

Capas como módulos, no como proyectos anidados: `api/` (routers delgados), `schemas.py` (DTOs
Pydantic), `services.py` (lógica de negocio, sin importar FastAPI y sin códigos HTTP: lanza
excepciones de dominio), `repositories.py` (interfaz `Protocol` + implementación SQLAlchemy
inyectada por dependencia), `models.py` (ORM) y `core/` (configuración, excepciones, middleware,
logging).

## Consecuencias

- **Positivo:** el servicio se prueba sin HTTP; el ORM se puede sustituir detrás de la interfaz;
  el flujo de una petición se sigue leyendo tres archivos.
- **Negativo:** el servicio no está aislado del todo de SQLAlchemy — captura `IntegrityError` y
  conoce el modelo `Customer` para traducirla en `EmailAlreadyExists`. Una capa de dominio pura
  añadiría dos archivos más por entidad sin beneficio con este tamaño; se documentó el trade en
  lugar de ocultarlo.
- **Alternativas descartadas:** todo en el router (imposible de probar); Clean Architecture
  completa (sobreingeniería para una entidad).
