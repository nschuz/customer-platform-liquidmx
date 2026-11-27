# ADR-0003: El frontend mock-primero, con la API real por `PUBLIC_API_URL` en tiempo de ejecución

- **Estado:** aceptada
- **Fecha:** 2026-11-27

## Contexto

El enunciado del frontend permite una API simulada dentro de SvelteKit y pide un repositorio que
se pueda ejecutar y juzgar por separado. La manera habitual de configurar la URL (una variable
pública del bundle) fija el destino al compilar, lo que obliga a reconstruir la imagen para
cambiar de mock a API real.

## Decisión

Sin `PUBLIC_API_URL` (el valor por defecto), el frontend sirve su propia API simulada en
`/api/customers…` (en memoria, 10 clientes, latencia simulada de 300–600 ms, mismo contrato y
mismo envelope de error que el backend). Con `PUBLIC_API_URL` definida, el navegador llama a la
API real. La URL base se resuelve en un único punto del cliente HTTP. Al usar `adapter-node`, la
variable se lee **al arrancar el servidor Node**, no al compilar: en Docker es una variable del
contenedor y cambiarla no requiere reconstruir (verificado con el mismo `build/`).

## Consecuencias

- **Positivo:** cada mitad del monorepo se entrega, ejecuta y demuestra sola; conectarlas cuesta
  una variable; en Docker el cambio mock/real es un `up -d frontend`.
- **Negativo:** se mantiene un segundo servidor que replica el contrato (con sus tests); si el
  backend cambia de contrato, el mock debe cambiar con él. Los mensajes de error del backend
  real están en inglés y el frontend los describe en español a partir del `code`.
- **Alternativas descartadas:** solo API real (el frontend no funcionaría solo); variable de
  build (acopla el destino a la imagen).
