# ORQUESTACION.md

## Diagrama

    ┌─────────────────────────────────────────────┐
    │               PIZARRÓN                      │
    │  (estado compartido: resultados + hechos)   │
    └──────┬──────────┬──────────┬────────────────┘
           │leer/escr.│leer/escr.│leer/escr.
           ▼          ▼          ▼
      ┌─────────┐ ┌─────────┐ ┌─────────┐
      │Agente A │ │Agente B │ │Agente N │
      │(espec.) │ │(espec.) │ │(espec.) │
      └────┬────┘ └────┬────┘ └────┬────┘
           │            │            │
           └────────────┼────────────┘
                        ▼
    ┌─────────────────────────────────────────────┐
    │             Controlador                     │
    │  (monitorea pizarrón, dispara agente sigui.)│
    └─────────────────────────────────────────────┘


## Workflow
Pizarrón (Blackboard)

## Objetivo
Coordinar múltiples agentes especialistas a través de un espacio de conocimiento compartido del que todos leen y en el que todos escriben — sin que ningún agente sea dueño de la solución completa. El pizarrón evoluciona hasta que se cumple una condición de parada.

## Roles
- **Pizarrón (estado compartido):** estructura de datos central que contiene todos los hechos, resultados parciales, hipótesis y metadatos. Todos los agentes leen y escriben aquí.
- **Agentes especialistas:** expertos independientes que monitorean el pizarrón, se activan cuando se cumplen sus precondiciones y publican contribuciones.
- **Controlador:** monitorea el estado del pizarrón, decide qué agente corre a continuación (o ejecuta todos los elegibles en paralelo) y declara parada cuando se alcanza el objetivo.

## Cuándo usar
- Problemas donde distintos tipos de expertise deben colaborar en una solución compartida en evolución.
- Tareas de análisis complejo sin una secuencia fija: cada contribución habilita al siguiente experto.
- Escenarios donde el camino de solución es emergente — no se pueden planificar todos los pasos de antemano.
- Síntesis de investigación, análisis legal, diagnóstico multimodal, revisión de arquitectura.

## Protocolo
1. Controlador inicializa el pizarrón con el enunciado del problema y los hechos conocidos.
2. Controlador evalúa qué agentes tienen sus precondiciones satisfechas.
3. Los agentes elegibles son activados (secuencialmente o en paralelo según su independencia).
4. Cada agente lee las entradas relevantes del pizarrón, razona y publica sus conclusiones.
5. Controlador verifica la condición de parada después de cada ciclo de contribuciones.
6. Si no se cumple la parada: volver al paso 2.
7. Si se cumple la parada o ningún agente puede contribuir: Controlador sintetiza la respuesta final a partir del pizarrón.

## Formato de entrada al pizarrón
Cada agente escribe entradas con:
- `autor`: nombre del agente.
- `tipo`: `hecho | hipótesis | resultado | alerta | pregunta`.
- `contenido`: el hallazgo.
- `confianza`: 0–100.
- `dependencias`: lista de entradas del pizarrón de las que se derivó.

## Reglas
- Los agentes nunca deben eliminar ni sobreescribir entradas existentes del pizarrón — solo agregar.
- El Controlador debe prevenir bucles infinitos: el mismo agente no puede activarse dos veces sobre el mismo subconjunto sin cambios.
- Todas las escrituras al pizarrón deben ser atómicas y con marca de tiempo.
- Las condiciones de parada deben definirse antes de abrir el pizarrón.
- Si ningún agente puede avanzar tras un ciclo completo, escalar a un humano con el estado actual del pizarrón.

## Condiciones de parada
- Entrada de objetivo publicada con confianza ≥ umbral configurado.
- Todos los agentes especialistas han reportado que no tienen nuevas contribuciones.
- Límite máximo de iteraciones alcanzado.

## Entregables
- Respuesta final sintetizada con cadena de procedencia.
- Log completo del pizarrón (todas las entradas, autores, marcas de tiempo).
- Reporte de confianza y cobertura por especialista.
