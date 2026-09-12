# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │          Orquestador de Workflow         │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │         Agente (trabajo autónomo)        │
    └────────────────────┬─────────────────────┘
                         ▼
                  ┌─────────────┐
                  │  ¿Punto de  │
                  │  revisión?  │
                  └──────┬──────┘
                    no   │  sí
        ┌────────────────┴──────────────────┐
        ▼                                   ▼
    ┌──────────┐              ┌─────────────────────────┐
    │ Continuar│              │   Puerta de revisión    │
    │ autonomía│              │   humana (apr/rech/edit) │
    └──────────┘              └────────────┬────────────┘
                               aprobado    │  rechazado
                           ┌──────────────┴──────────────┐
                           ▼                              ▼
                   ┌──────────────┐             ┌──────────────────┐
                   │  Continuar   │             │  Agente reitera  │
                   │  workflow    │             │  con feedback    │
                   └──────────────┘             └──────────────────┘


## Workflow
Humano en el Bucle (Human-in-the-Loop)

## Objetivo
Incorporar puertas obligatorias de revisión humana en puntos críticos de un workflow que de otro modo sería autónomo. Los agentes manejan todo el trabajo rutinario; los humanos son convocados solo cuando las decisiones superan umbrales de riesgo definidos, garantizando velocidad sin sacrificar control.

## Roles
- **Orquestador de workflow:** gestiona el flujo completo y conoce qué puntos de control requieren aprobación humana.
- **Agentes ejecutores:** realizan trabajo autónomo entre puntos de control.
- **Revisor humano:** recibe breviarios de revisión formateados, aprueba/rechaza/edita y proporciona feedback.
- **Agente de puerta:** empaqueta las salidas del punto de control en un breviario claro de revisión y espera la decisión humana.

## Cuándo usar
- Cualquier workflow de IA donde las decisiones tienen consecuencias reales irreversibles (publicación, pagos, despliegues).
- Industrias reguladas que requieren firma humana en salidas generadas por IA.
- Workflows nuevos en sus primeras N ejecuciones antes de establecer confianza.
- Cuando la confianza del agente cae por debajo de un umbral definido.
- Automatización gradual: comenzar con muchas puertas y eliminarlas a medida que se prueba la fiabilidad.

## Disparadores de punto de control
Se requiere una puerta humana cuando cualquiera de los siguientes es verdadero:
- La acción es irreversible (eliminar, publicar, pagar, desplegar a producción).
- El impacto estimado supera el umbral definido (ej. costo > $500, usuarios afectados > 1000).
- La puntuación de confianza del agente < mínimo configurado.
- La acción toca una categoría sensible (PII, legal, compliance, seguridad).
- Es la primera vez que se realiza este tipo de acción.

## Protocolo
1. El Orquestador y los agentes ejecutan trabajo autónomamente hasta que se alcanza un disparador de punto de control.
2. El Agente de puerta empaqueta un breviario de revisión: qué se hizo, qué se propone, análisis de impacto, confianza y una elección clara de aprobar/rechazar/editar.
3. El breviario se entrega al Revisor humano por el canal configurado (Slack, email, UI).
4. El Revisor humano responde dentro del timeout:
   - **Aprobado:** el Orquestador continúa.
   - **Rechazado con feedback:** el Agente reitera y vuelve a la misma puerta.
   - **Editado:** la edición del humano se acepta tal cual; el Orquestador continúa con esa versión.
5. Si el timeout expira: escalar; el workflow se detiene hasta recibir respuesta.
6. Todas las decisiones de puerta se registran con identidad del humano, marca de tiempo y justificación.

## Reglas
- Las puertas deben configurarse antes de que el workflow comience — sin puertas ad-hoc.
- El humano debe recibir contexto suficiente para tomar una decisión informada en menos de 2 minutos.
- Los agentes nunca deben reintentar una acción rechazada sin incorporar el feedback humano.
- La aprobación del nivel de rol incorrecto no es válida (ajustar el revisor al nivel de riesgo).
- Los registros de puerta son registros de auditoría inmutables.

## Entregables
- Salida completa del workflow (post todas las aprobaciones).
- Log de auditoría de decisiones de puerta: revisor, decisión, marca de tiempo, feedback, intentos.
- Reporte de cobertura de automatización: % de pasos manejados autónomamente vs. con puerta.
- Puertas recomendadas para relajar después de N ejecuciones exitosas.
