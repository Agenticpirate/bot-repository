# ORQUESTACION.md

## Diagrama

                    ┌───────────────┐
                    │      Hub      │
                    │(Orquestador)  │
                    └──┬────┬────┬──┘
                       │    │    │
              ┌────────┘    │    └────────┐
              ▼             ▼             ▼
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │   Spoke   │ │   Spoke   │ │   Spoke   │
        │Implement. │ │Validación │ │   Docs    │
        └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                    ┌───────────────┐
                    │  Hub integra  │
                    │  + publica    │
                    └───────────────┘


## Workflow
Hub-and-spoke

## Objetivo
Centralizar coordinación en un hub (orquestador) y delegar ejecución a spokes (agentes especialistas), minimizando desalineación.

## Roles
- **Hub / Orquestador:** prioriza, divide, integra, decide trade-offs.
- **Spoke Implementación:** construye solución.
- **Spoke Validación:** pruebas, QA, compliance.
- **Spoke Documentación:** runbook/changelog/entrega.

## Cuándo usar
- Múltiples frentes de trabajo con dependencia de una sola dirección técnica.
- Necesidad de control fuerte de alcance y calidad.

## Política de operación
1. Hub define backlog en tareas atómicas.
2. Cada spoke toma 1-2 tareas con owner explícito.
3. Todo vuelve al hub para integración.
4. Hub publica estado consolidado por hitos.

## SLA sugerido
- Update operativo cada 60-90 min.
- Bloqueo >30 min => escalar al hub.

## Entregables
- Plan consolidado
- Resultado integrado
- Riesgos + mitigaciones
- Decisiones técnicas registradas
