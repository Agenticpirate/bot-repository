# ORQUESTACION.md

## Diagrama

    ┌─────────────────────────────────┐
    │            Splitter             │
    │  (particionar input en trozos)  │
    └───────┬──────────┬──────────┬───┘
            │          │          │
            v          v          v
       ┌────────┐ ┌────────┐ ┌────────┐
       │Mapper 1│ │Mapper 2│ │Mapper N│
       └───┬────┘ └───┬────┘ └───┬────┘
           │          │          │
           v          v          v
    ┌─────────────────────────────────┐
    │            Reducer              │
    │   (fusionar parcial en final)   │
    └─────────────────────────────────┘

## Workflow
Map-Reduce (dividir, procesar en paralelo, unificar)

## Objetivo
Descomponer un problema grande en sub-tareas independientes, procesarlas concurrentemente y fusionar resultados en una salida coherente.

## Roles
- **Splitter:** particiona la entrada en fragmentos con límites claros.
- **N Mappers:** cada uno procesa un fragmento independientemente.
- **Reducer:** fusiona todas las salidas parciales en un resultado único.

## Cuándo usar
- Grandes datasets o colecciones de documentos.
- Análisis repetitivo sobre muchos ítems.
- La salida se puede agregar (conteos, resúmenes, rankings).

## Protocolo
1. Splitter define límites de fragmentos y esquema de salida.
2. Cada mapper recibe su fragmento + instrucciones compartidas.
3. Mappers producen resultados parciales estructurados.
4. Reducer recolecta todos los parciales, resuelve conflictos, produce salida final.

## Reglas
- Los fragmentos no deben solaparse.
- Todos los mappers usan el mismo esquema de salida.
- Reducer debe manejar parciales faltantes o malformados con gracia.

## Riesgos comunes
- Fragmentos desiguales causando cuellos de botella.
- Drift de esquema entre mappers.
- Pérdida de contexto en bordes de fragmento.

## Mitigación
- Esquema fijo reforzado antes de la fase map.
- Margen de solapamiento en bordes para contexto.
- Reducer valida completitud antes de finalizar.
