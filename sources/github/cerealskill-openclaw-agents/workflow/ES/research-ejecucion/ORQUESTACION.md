# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────┐
    │   Fase 1: Research           │
    │ preguntas → opciones → rec.  │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │       Gate de Decisión       │
    │  (aprobar antes de construir)│
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │   Fase 2: Ejecución          │
    │ implementar → validar → doc  │
    └──────────────────────────────┘


## Workflow
Research + ejecución

## Objetivo
Separar claramente fase de investigación y fase de implementación para reducir retrabajo.

## Fase 1: Research
- Preguntas clave
- Opciones comparadas
- Recomendación con trade-offs
- Criterio de decisión

## Fase 2: Ejecución
- Implementar opción aprobada
- Validar contra criterios de éxito
- Documentar decisiones finales

## Reglas
- No implementar sin decisión explícita post-research.
- Research debe traer evidencia (docs, benchmarks, referencias).

## Entregables
- Brief técnico (research)
- Plan de implementación
- Resultado + validación
