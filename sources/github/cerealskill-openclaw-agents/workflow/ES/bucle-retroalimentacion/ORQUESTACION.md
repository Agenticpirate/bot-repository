# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │              Input Inicial               │
    └────────────────────┬─────────────────────┘
                         ▼
              ┌──────────────────┐
              │  Agente Borrador │
              │  (producir v1)   │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  Agente Revisor  │
              │ (evaluar + puntuar│
              │  contra rúbrica) │
              └────────┬─────────┘
                       ▼
                  ┌───────────┐
                  │¿Convergió?│
                  └────┬──────┘
              no       │     sí
         ┌─────────────┴─────────────┐
         ▼                           ▼
    ┌──────────────┐       ┌──────────────────┐
    │  Feedback    │       │  Entrega Final   │
    │  (correcciones│      └──────────────────┘
    │   específicas)│
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │Agente Borrador│
    │  (revisar)   │──── vuelve a Revisor
    └──────────────┘


## Workflow
Bucle de Retroalimentación (refinamiento iterativo)

## Objetivo
Producir output de alta calidad mediante ciclos iterativos de borrador y revisión hasta cumplir criterios de convergencia, sin jerarquía fija.

## Roles
- **Agente Borrador:** produce y revisa trabajo basado en feedback.
- **Agente Revisor:** evalúa output contra rúbrica, puntúa calidad, provee feedback accionable.
- **Monitor de Convergencia:** trackea conteo de iteraciones y puntajes para prevenir loops infinitos.

## Cuándo usar
- Output creativo o analítico que se beneficia de refinamiento (docs, código, propuestas).
- Cuando la calidad es difícil de lograr en el primer intento.
- Tareas donde la mejora incremental es más efectiva que una sola pasada.

## Protocolo
1. Agente Borrador produce versión inicial (v1).
2. Agente Revisor evalúa contra rúbrica y asigna puntaje de calidad (0–100).
3. Si puntaje ≥ umbral (configurable, default 85) → entregar.
4. Si puntaje < umbral → Revisor provee feedback específico y accionable.
5. Agente Borrador revisa basado en feedback → produce v(n+1).
6. Repetir desde paso 2.
7. Si máximo de iteraciones alcanzado sin convergencia → entregar mejor versión con disclaimer de calidad.

## Criterios de convergencia
- **Umbral de calidad:** 85/100 (configurable)
- **Máximo iteraciones:** 5 (previene loops infinitos)
- **Piso de mejora:** si el puntaje mejora < 3 puntos entre iteraciones, parar temprano (retornos decrecientes)

## Reglas
- El feedback debe ser específico y accionable (nada de "mejoralo" genérico).
- Cada iteración debe referenciar qué cambió respecto a la versión anterior.
- El Agente Revisor no debe reescribir — solo evaluar y guiar.
- Todas las versiones preservadas para comparación.

## Entregables
- Output final (mejor versión)
- Log de iteraciones (versión, puntaje, resumen de feedback)
- Reporte de convergencia (iteraciones usadas, trayectoria de puntaje)
