# ORQUESTACION.md

## Diagrama

    ┌───────────────────────────────────┐
    │     Coordinador de Swarm          │
    │    (particionar + asignar)        │
    └──────┬──────────┬──────────┬──────┘
           │          │          │
           ▼          ▼          ▼
      ┌────────┐ ┌────────┐ ┌────────┐
      │Agente 1│ │Agente 2│ │Agente N│
      │(trozo) │ │(trozo) │ │(trozo) │
      └───┬────┘ └───┬────┘ └───┬────┘
          │          │          │
          ▼          ▼          ▼
    ┌───────────────────────────────────┐
    │        Validador Final            │
    │  (merge + reconciliar + validar)  │
    └───────────────────────────────────┘


## Workflow
Swarm paralelo

## Objetivo
Acelerar ejecución dividiendo trabajo en piezas independientes que corren en paralelo.

## Roles
- **Coordinador de swarm:** particiona y consolida.
- **N agentes ejecutores:** cada uno en subproblema aislado.
- **Validador final:** detecta inconsistencias cruzadas.

## Cuándo usar
- Tareas altamente paralelizables.
- Ventana de tiempo corta.

## Reglas
1. Diseñar partición sin solapamiento.
2. Definir contrato de salida por agente.
3. Sincronización en checkpoints fijos.
4. Merge final con validación de compatibilidad.

## Riesgos comunes
- Duplicidad de trabajo
- Incompatibilidad entre salidas
- Drift de criterios

## Mitigación
- Plantilla única de salida
- Convenciones compartidas
- Reconciliación técnica obligatoria al cierre
