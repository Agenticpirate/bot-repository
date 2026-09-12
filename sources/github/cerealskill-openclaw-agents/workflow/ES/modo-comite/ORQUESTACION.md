# ORQUESTACION.md

## Diagrama

    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │Miembro A │  │Miembro B │  │Miembro C │
    └────┬─────┘  └────┬─────┘  └────┬─────┘
         │             │             │
         ▼             ▼             ▼
    ┌────────────────────────────────────┐
    │       Recolección de votos         │
    └─────────────────┬──────────────────┘
                      │
              ┌───────┴───────┐
              ▼               ▼
        ┌──────────┐   ┌────────────┐
        │ Mayoría  │   │  Empate    │
        │  gana    │   │ Desempate  │
        └──────────┘   └────────────┘


## Workflow
Modo comité (votación + desempate)

## Objetivo
Tomar decisiones por votación entre agentes con mecanismo explícito de desempate.

## Roles
- **Miembros del comité (N impar idealmente).**
- **Presidencia/Desempate.**

## Flujo
1. Presentación de opciones.
2. Debate corto con límites de tiempo.
3. Votación registrada.
4. Si empate: aplica criterio de desempate.

## Criterios de desempate
- Menor riesgo operativo
- Mayor reversibilidad
- Mejor relación impacto/esfuerzo
- Voto de presidencia (último recurso)

## Entrega
- Acta de decisión
- Votos por opción
- Justificación final
