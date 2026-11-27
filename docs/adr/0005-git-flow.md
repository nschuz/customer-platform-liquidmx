# ADR-0005: Git Flow clásico en un desarrollo de una sola persona

- **Estado:** aceptada
- **Fecha:** 2026-11-27

## Contexto

El desarrollo lo hace una sola persona, pero "uso correcto de Git" es un criterio
explícito de evaluación y el historial se va a publicar en un remote.

## Decisión

Git Flow clásico: `main` solo recibe releases (cada merge es un release etiquetado `vX.Y.Z`),
`develop` integra, cada unidad de trabajo vive en `feature/*` y se fusiona con `--no-ff` (el
grafo muestra las ramas), y `release/*` prepara cada versión (documentación final, verificación)
antes del merge a `main` y de la vuelta a `develop`. Mensajes en Conventional Commits, commits
pequeños y tests junto al comportamiento que especifican.

## Consecuencias

- **Positivo:** el grafo del repositorio enseña el flujo completo; cada release es un punto
  auditable; las ramas fusionadas se conservan como histórico.
- **Negativo:** más ceremonias que un trunk-based para una persona (rama + dos merges por
  unidad); se asume a cambio porque el destinatario del historial es un evaluador.
- **Alternativas descartadas:** trunk-based con squash (historial plano, menos que mostrar);
  commits directos a `main` (sin aislamiento ni puntos de release).
