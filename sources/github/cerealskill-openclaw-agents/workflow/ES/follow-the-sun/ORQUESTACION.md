# ORQUESTACION.md

## Diagrama

    ┌──────────┐  handoff  ┌──────────┐  handoff  ┌──────────┐
    │ Bloque A │─────────▶│ Bloque B │─────────▶│ Bloque C │
    │ Ejecutar │          │ Continuar│          │  Cerrar  │
    └──────────┘          └──────────┘          └──────────┘
         │                     │                     │
         ▼                     ▼                     ▼
    ┌──────────┐          ┌──────────┐          ┌──────────┐
    │ Reporte  │          │ Reporte  │          │ Reporte  │
    │ handoff  │          │ handoff  │          │  final   │
    └──────────┘          └──────────┘          └──────────┘


## Workflow
Follow-the-sun (handoff por bloques)

## Objetivo
Mantener avance continuo mediante traspasos estructurados entre agentes por bloques horarios.

## Bloques
- **Bloque A:** ejecución inicial
- **Bloque B:** continuidad + validación
- **Bloque C:** cierre/documentación

## Formato de handoff (obligatorio)
- Estado actual
- Qué se logró
- Qué falta
- Bloqueos
- Próximo primer paso recomendado

## Reglas
- Sin handoff completo, no se considera transferencia válida.
- El receptor confirma recepción con plan de arranque.

## Métrica clave
- Tiempo muerto entre bloques <15 min (objetivo).
