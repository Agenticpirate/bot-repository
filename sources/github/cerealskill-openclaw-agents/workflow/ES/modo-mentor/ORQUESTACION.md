# ORQUESTACION.md

## Diagrama

    ┌──────────┐          ┌──────────┐
    │  Junior  │─────────>│  Senior  │
    │ Borrador │          │ Revision │
    └──────────┘          └────┬─────┘
                               │
                     ┌─────────┴──────────┐
                     v                    v
               ┌──────────┐        ┌──────────┐
               │ Aprobado │        │ Feedback │
               │  Enviar  │        │  Rehacer │
               └──────────┘        └────┬─────┘
                                        │
                                        v
                                  ┌──────────┐
                                  │  Junior  │
                                  │  Corrige │
                                  └──────────┘

## Workflow
Modo mentor (senior revisa junior antes de entrega)

## Objetivo
Subir calidad de entrega y acelerar aprendizaje mediante revisión guiada.

## Roles
- **Junior:** ejecuta propuesta inicial.
- **Senior/Mentor:** revisa, corrige, enseña.

## Flujo
1. Junior entrega borrador funcional.
2. Senior revisa contra checklist.
3. Junior aplica correcciones.
4. Senior da aprobación final.

## Checklist del mentor
- Correctitud técnica
- Claridad y mantenibilidad
- Riesgos y edge cases
- Calidad de comunicación de salida

## Regla clave
- Nada se entrega externo sin revisión senior.

## Entregables
- Versión final aprobada
- Feedback breve para aprendizaje
