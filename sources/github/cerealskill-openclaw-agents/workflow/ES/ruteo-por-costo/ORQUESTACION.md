# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │            Tarea Entrante                │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │          Router por Costo                │
    │  (clasificar complejidad + costo)         │
    └────────────────────┬─────────────────────┘
                         ▼
              ┌──────────────────┐
              │  ¿Tier de tarea? │
              └────┬──────┬──────┘
            bajo   │  med │  alto
         ┌─────────┼──────┼──────────┐
         ▼         ▼      ▼          │
    ┌─────────┐ ┌──────┐ ┌────────┐  │
    │ Agente  │ │Agente│ │Agente  │  │
    │  Lite   │ │ Mid  │ │Premium │  │
    │(rápido/ │ │(balan│ │(mejor  │  │
    │ barato) │ │ceado)│ │calidad)│  │
    └────┬────┘ └──┬───┘ └───┬────┘  │
         │         │         │       │
         ▼         ▼         ▼       │
    ┌──────────────────────────────┐ │
    │  Quality Gate (spot-check)   │ │
    └──────────────┬───────────────┘ │
              pasa │   falla         │
         ┌─────────┴─────────┐       │
         ▼                   ▼       │
    ┌──────────┐    ┌──────────────┐ │
    │ Entregar │    │ Escalar a    │─┘
    └──────────┘    │ tier superior│
                    └──────────────┘


## Workflow
Router por Costo (ruteo de tareas optimizado por costo)

## Objetivo
Rutear tareas al agente más costo-eficiente capaz de manejarlas, usando agentes caros/poderosos solo cuando la complejidad de la tarea lo justifica.

## Roles
- **Router por Costo:** clasifica tareas entrantes por complejidad y rutea al tier apropiado.
- **Agente Lite:** maneja tareas simples y rutinarias (modelo rápido, bajo costo).
- **Agente Mid:** maneja complejidad moderada (modelo balanceado).
- **Agente Premium:** maneja tareas complejas y de alto impacto (mejor modelo, mayor costo).
- **Quality Gate:** verifica por muestreo que el tier elegido fue adecuado.

## Cuándo usar
- Procesamiento de tareas de alto volumen donde el costo importa.
- Workloads mixtos con complejidad variable (tickets de soporte, code reviews, contenido).
- Cuando tenés agentes respaldados por diferentes modelos (ej: GPT-4o-mini vs Claude Opus).
- Entornos con presupuesto limitado que igual necesitan garantías de calidad.

## Protocolo
1. Tarea llega al Router por Costo.
2. Router clasifica complejidad usando heurísticas:
   - **Bajo:** templates, lookup, Q&A simple, formateo.
   - **Medio:** análisis, resúmenes, razonamiento moderado.
   - **Alto:** razonamiento multi-paso, creativo, ambiguo, alto impacto.
3. Router despacha al tier de agente correspondiente.
4. Agente ejecuta y retorna resultado.
5. Quality Gate verifica una muestra de resultados (% configurable por tier).
6. Si calidad falla → escalar a siguiente tier superior y re-ejecutar.
7. Trackear precisión de ruteo y ajustar heurísticas de clasificación con el tiempo.

## Definición de tiers (ejemplo)
| Tier    | Modelo ejemplo      | Costo | Velocidad | Usar para                       |
|---------|---------------------|-------|-----------|----------------------------------|
| Lite    | GPT-4o-mini, Haiku  | $     | Rápido    | Templates, lookup, formateo      |
| Mid     | GPT-4o, Sonnet      | $$    | Medio     | Análisis, resúmenes              |
| Premium | Claude Opus, o1     | $$$   | Lento     | Razonamiento complejo, alto impacto |

## Quality gate
- **Tasa de spot-check:** 20% de Lite, 10% de Mid, 5% de Premium
- **Evaluación:** rúbrica automatizada o un agente Premium revisando el output
- **Escalamiento:** si calidad < umbral, re-rutear a siguiente tier

## Reglas
- Siempre empezar por el tier más bajo que pueda manejar la tarea (optimizar por costo).
- Nunca saltear tiers durante escalamiento (Lite → Mid → Premium, no Lite → Premium).
- Trackear costo por tarea y ahorro vs. baseline todo-Premium.
- Las heurísticas de clasificación son reglas vivas — actualizar según patrones de escalamiento.
- Override humano: usuarios pueden forzar un tier específico para tareas críticas.

## Métricas
- **Precisión de ruteo:** % de tareas que pasan Quality Gate en primer tier
- **Ahorro de costo:** gasto real vs. baseline todo-Premium
- **Tasa de escalamiento:** % de tareas que necesitaron upgrade de tier
- **Latencia promedio:** por tier

## Entregables
- Log de ruteo de tareas (tarea, clasificación, tier, resultado, puntaje de calidad)
- Reporte de costos (por tier, total, ahorros)
- Reporte de escalamiento (qué tareas necesitaron upgrade y por qué)
- Tendencias de precisión de clasificación
