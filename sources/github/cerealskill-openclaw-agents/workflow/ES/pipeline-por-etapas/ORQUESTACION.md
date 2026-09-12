# ORQUESTACION.md

## Diagrama

    ┌──────────────┐ gate ┌────────┐ gate ┌──────────────┐
    │Descubrimiento│─────>│ Diseno │─────>│ Implementac. │
    └──────────────┘      └────────┘      └──────┬───────┘
                                                 │
                                            gate │
                                                 v
                                          ┌────────────┐ gate ┌──────────┐
                                          │ Validacion │─────>│ Entrega  │
                                          └────────────┘      └──────────┘

    [x] fallo de gate --> rollback a etapa anterior

## Workflow
Pipeline por etapas

## Objetivo
Ejecutar trabajo secuencial por etapas con gates de calidad entre fases.

## Etapas estándar
1. **Descubrimiento** (requisitos y restricciones)
2. **Diseño** (solución y plan)
3. **Implementación**
4. **Validación** (tests + revisión)
5. **Entrega**

## Reglas
- No se avanza de etapa sin criterios de salida cumplidos.
- Cada etapa produce artefacto verificable.
- Si falla un gate, rollback a etapa anterior.

## Criterios por etapa
- Descubrimiento: problema definido + alcance cerrado.
- Diseño: arquitectura y riesgos aprobados.
- Implementación: cambios completos + lint/build OK.
- Validación: test plan ejecutado + evidencia.
- Entrega: resumen ejecutivo + próximos pasos.

## Escalamiento
- 2 fallos consecutivos de gate => revisión de diseño.
