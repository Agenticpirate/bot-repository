# ORQUESTACION.md

## Diagrama

    ┌────────────┐                  ┌──────────────┐
    │ Core Team  │─── trigger ─────>│ Especialista │
    │  (activo)  │                  │  (acotado)   │
    └─────┬──────┘                  └──────┬───────┘
          │                                │
          │       ┌──────────────┐         │
          │       │   Dictamen   │<────────┘
          │       │  accionable  │
          │       └──────┬───────┘
          │              │
          v              v
    ┌────────────────────────────┐
    │  Plan actualizado + close │
    └────────────────────────────┘

## Workflow
Especialista bajo demanda

## Objetivo
Activar especialistas (legal, finanzas, docs, seguridad, etc.) solo cuando el caso lo requiere.

## Trigger de activación
- Requisito regulatorio/compliance
- Impacto financiero relevante
- Entrega formal externa
- Riesgo alto no cubierto por equipo base

## Roles
- **Core team:** ejecuta camino principal.
- **Especialista:** interviene por ventana acotada.

## Reglas
- Toda activación debe indicar motivo + alcance.
- Especialista entrega dictamen accionable, no genérico.
- Cerrar activación al resolver condición gatillo.

## Entrega
- Dictamen del especialista
- Cambios aplicados al plan
