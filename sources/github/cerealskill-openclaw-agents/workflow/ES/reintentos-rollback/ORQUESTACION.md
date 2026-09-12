# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │            Tarea Asignada                │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │           Agente Ejecutor                │
    │         (intentar tarea)                 │
    └────────────────────┬─────────────────────┘
                         ▼
                    ┌─────────┐
                    │¿Éxito?  │
                    └────┬────┘
                   sí    │   no
              ┌──────────┴──────────┐
              ▼                     ▼
    ┌──────────────┐     ┌───────────────────┐
    │  Entregar    │     │  ¿Reintentos      │
    │  Resultado   │     │   agotados?       │
    └──────────────┘     └────────┬──────────┘
                            no   │   sí
                      ┌──────────┴──────────┐
                      ▼                     ▼
              ┌──────────────┐    ┌──────────────────┐
              │ Backoff +    │    │  Agente Rollback  │
              │ Reintento    │    │  (compensar +     │
              └──────┬───────┘    │  restaurar estado)│
                     │            └────────┬──────────┘
                     ▼                     ▼
              ┌──────────────┐    ┌──────────────────┐
              │  Ejecutor    │    │  Escalar a       │
              │(re-intentar) │    │  Humano          │
              └──────────────┘    └──────────────────┘


## Workflow
Reintentos y Rollback (ejecución resiliente de tareas)

## Objetivo
Asegurar que las tareas se completen de forma confiable reintentando ante fallos transitorios, revirtiendo cambios parciales ante fallos permanentes, y escalando cuando la recuperación es imposible.

## Roles
- **Ejecutor:** intenta la tarea y reporta éxito/fallo con contexto.
- **Controlador de reintentos:** decide si reintentar (transitorio) o abortar (permanente), gestiona backoff.
- **Agente de rollback:** revierte cambios parciales usando acciones de compensación.
- **Destino de escalamiento:** humano o supervisor notificado cuando se agota toda recuperación.

## Cuándo usar
- Tareas que modifican estado (deploys, migraciones de datos, llamadas API).
- Entornos con fallos transitorios (red, rate limits, timeouts).
- Cualquier workflow donde completar parcialmente es peor que no completar.

## Protocolo
1. Ejecutor intenta la tarea y crea checkpoint del estado antes de mutar.
2. Ante fallo, clasificar error:
   - **Transitorio** (timeout, 429, 503): reintentar con backoff exponencial.
   - **Permanente** (4xx, validación, error lógico): saltar a rollback.
3. Reintentar hasta N intentos (presupuesto configurable).
4. Si reintentos agotados → activar Agente de Rollback.
5. Agente de Rollback ejecuta acciones de compensación en orden inverso.
6. Si rollback exitoso → reportar fallo limpio con contexto.
7. Si rollback falla → escalar a humano inmediatamente.

## Política de reintentos
- **Máximo reintentos:** 3 (configurable por tarea)
- **Backoff:** exponencial (1s, 2s, 4s) con jitter
- **Timeout por intento:** 30s default
- **Circuit breaker:** tras 3 fallos consecutivos, pausar reintentos durante cooldown

## Reglas de rollback
- Acciones de compensación deben ser idempotentes.
- Ejecutar en orden cronológico inverso.
- Cada paso de rollback se reintenta una vez ante fallo.
- Log completo de rollback con timestamps.

## Reglas
- Nunca reintentar errores permanentes.
- Siempre hacer checkpoint antes de mutar.
- El rollback debe dejar el sistema en estado conocido y sano.
- Todos los intentos y resultados loggeados para auditoría.

## Entregables
- Log de intentos de ejecución (intento #, error, clasificación)
- Log de acciones de rollback (si se activó)
- Estado final: éxito | revertido | escalado
- Métricas: intentos usados, tiempo total transcurrido
