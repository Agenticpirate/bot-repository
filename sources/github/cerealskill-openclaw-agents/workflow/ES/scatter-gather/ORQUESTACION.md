# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │              Despachador                 │
    │  (transmite misma tarea a todos)         │
    └──────┬──────────┬──────────┬─────────────┘
           │          │          │
           ▼          ▼          ▼
      ┌─────────┐ ┌─────────┐ ┌─────────┐
      │Solver 1 │ │Solver 2 │ │Solver N │
      │(intento)│ │(intento)│ │(intento)│
      └────┬────┘ └────┬────┘ └────┬────┘
           │            │            │
           └────────────┼────────────┘
                        ▼
    ┌──────────────────────────────────────────┐
    │              Agregador                   │
    │  (puntuar + seleccionar mejor / mezclar) │
    └──────────────────────────────────────────┘


## Workflow
Scatter-Gather (Dispersar y Recopilar)

## Objetivo
Transmitir la misma tarea a múltiples solvers independientes simultáneamente, luego puntuar y seleccionar la mejor respuesta (o fusionar las mejores partes). Maximiza la calidad cuando la salida de un solo agente es poco fiable o cuando la diversidad de enfoques mejora la cobertura.

## Roles
- **Despachador:** formula la tarea y la transmite de forma idéntica a todos los solvers.
- **Solvers (N agentes):** cada uno intenta la tarea completa de forma independiente usando su propio enfoque, persona o configuración.
- **Agregador:** recibe todas las respuestas, las puntúa contra criterios definidos y devuelve el ganador o una composición sintetizada.

## Cuándo usar
- Salidas de alto riesgo donde la calidad importa más que la velocidad (copy crítico, decisiones de arquitectura, borradores legales).
- Tareas donde la diversidad de enfoques mejora la cobertura (detección de riesgos, síntesis de investigación).
- Cuando es probable que un solo agente omita casos borde o cometa errores sistemáticos.
- Pruebas A/B de distintas configuraciones de agentes en trabajo real.

## Protocolo
1. Despachador define la tarea con requisitos de salida explícitos y criterios de puntuación.
2. La tarea se transmite a todos los N solvers simultáneamente.
3. Todos los solvers producen respuestas independientes sin ver el trabajo de los demás.
4. El Agregador recibe las N respuestas.
5. El Agregador puntúa cada respuesta usando los criterios definidos en el paso 1.
6. El Agregador selecciona la mejor respuesta O sintetiza una composición usando los puntos fuertes de cada una.
7. El Agregador produce la salida final + justificación del puntaje + resumen de disidencia.

## Criterios de puntuación (configurables)
- Precisión / corrección
- Completitud (cobertura de requisitos)
- Concisión (sin relleno ni redundancia)
- Marcadores de riesgo identificados
- Cumplimiento del formato/restricciones

## Reglas
- Los solvers deben estar aislados — sin contaminación cruzada de salidas durante la generación.
- El brief de tarea del Despachador debe ser idéntico para todos los solvers.
- El Agregador debe documentar por qué se seleccionó al ganador (o cómo se construyó la composición).
- Mínimo N = 2; se recomienda N = 3 para la mayoría de las tareas.
- Si todos los solvers producen salidas de baja confianza, escalar en lugar de elegir la menos mala.

## Entregables
- Respuesta final seleccionada o compuesta.
- Matriz de puntuación para las N respuestas.
- Log de disidencia: diferencias significativas entre solvers que vale la pena destacar.
- N recomendado para tareas similares en el futuro.
