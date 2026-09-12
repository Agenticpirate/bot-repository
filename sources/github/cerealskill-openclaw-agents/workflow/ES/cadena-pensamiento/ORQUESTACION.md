# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │              Input Inicial               │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │  Agente A (enriquecer + transformar)     │
    │  output: input + contribución de A       │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │  Agente B (enriquecer + transformar)     │
    │  output: output de A + contribución de B │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │  Agente C (enriquecer + transformar)     │
    │  output: output de B + contribución de C │
    └────────────────────┬─────────────────────┘
                         ▼
                    ┌──────────┐
                    │¿Más      │
                    │agentes?  │
                    └────┬─────┘
                  no     │   sí
            ┌────────────┴────────────┐
            ▼                         ▼
    ┌──────────────┐         ┌──────────────┐
    │   Output     │         │  Agente N    │
    │   Final      │         │  (continuar) │
    └──────────────┘         └──────────────┘


## Workflow
Cadena de Pensamiento (enriquecimiento secuencial)

## Objetivo
Procesar una tarea a través de una secuencia flexible de agentes donde cada uno enriquece el output del anterior, construyendo un resultado progresivamente más completo.

## Roles
- **Agentes de cadena (A, B, C, … N):** cada uno recibe el output acumulado y agrega su expertise.
- **Controlador de Cadena:** define la secuencia de agentes, pasa output entre agentes, y valida el resultado final.

## Cuándo usar
- Tareas que requieren múltiples dominios de expertise aplicados secuencialmente.
- Cuando el output de un paso alimenta naturalmente al siguiente (investigación → análisis → recomendación → plan de acción).
- Más liviano que pipeline-por-etapas: sin quality gates, sin fases formales — solo enriquecimiento secuencial.

## Protocolo
1. Controlador de Cadena define la secuencia de agentes según la tarea.
2. El input inicial se pasa al Agente A.
3. Agente A procesa y retorna output enriquecido.
4. Output se pasa al Agente B, quien agrega su contribución.
5. Continuar a través de todos los agentes en secuencia.
6. Controlador de Cadena recoge output final del último agente.
7. Opcional: Controlador valida completud.

## Formato de handoff
Cada agente recibe un handoff estructurado:
- **Input original:** la solicitud inicial (siempre preservada).
- **Cadena hasta ahora:** contribuciones acumuladas de agentes previos.
- **Tu rol:** qué debe agregar este agente.

## Reglas
- Cada agente debe preservar todas las contribuciones previas — nunca descartar trabajo anterior.
- Cada agente debe marcar claramente qué agregó (atribución).
- Los agentes no deben salirse de scope — solo contribuir su expertise designada.
- La cadena puede reordenarse sin cambios de código (la secuencia es configuración, no lógica).

## Diferencias con pipeline-por-etapas
- Sin quality gates entre pasos.
- Sin definición formal de fases (Discovery, Design, etc.).
- Los agentes enriquecen en vez de transformar — acumulación, no reemplazo.
- Más flexible: agentes se pueden agregar/quitar/reordenar fácilmente.

## Entregables
- Output final enriquecido
- Log de contribuciones (qué agente agregó qué)
- Resumen de ejecución de cadena (secuencia, tiempos)
