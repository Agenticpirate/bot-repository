# ORQUESTACION.md

## Diagrama

    ┌───────────┐      ┌───────────┐      ┌──────────┐
    │ Solicitud │─────>│  Agente   │─────>│  Router  │
    │  (cruda)  │      │ de Triage │      │          │
    └───────────┘      └───────────┘      └────┬─────┘
                                               │
                       ┌───────────────────────┼───────────┐
                       v                       v           v
                  ┌─────────┐           ┌──────────┐ ┌─────────┐
                  │Handler A│           │Handler B │ │Handler C│
                  │ (bugs)  │           │(features)│ │(soporte)│
                  └─────────┘           └──────────┘ └─────────┘

## Workflow
Triage (clasificar, priorizar, enrutar)

## Objetivo
Categorizar rápidamente el trabajo entrante y enrutarlo al handler correcto con la prioridad adecuada.

## Roles
- **Agente de triage:** clasifica y prioriza.
- **Router:** asigna a la cola o agente correcto.
- **Handlers:** agentes especializados por dominio que ejecutan.

## Cuándo usar
- Alto volumen de solicitudes heterogéneas entrantes.
- Necesidad de criterios de priorización consistentes.
- Múltiples equipos o agentes especializados downstream.

## Protocolo
1. Agente de triage recibe solicitud cruda.
2. Clasifica por tipo (bug, feature, pregunta, incidente, etc.).
3. Asigna prioridad (P0-P3) usando criterios definidos.
4. Router envía a la cola del handler apropiado.
5. Handler confirma recepción dentro del SLA.

## Criterios de prioridad
| Prioridad | Descripción | SLA de respuesta |
|-----------|-------------|------------------|
| P0 | Crítico / caída | Inmediato |
| P1 | Alto impacto, workaround existe | < 1 hora |
| P2 | Medio, sin urgencia | < 4 horas |
| P3 | Bajo / informativo | Best effort |

## Reglas
- Toda solicitud recibe una clasificación — sin drops silenciosos.
- Solicitudes ambiguas van a P2 por defecto y se marcan para revisión humana.
- Re-triage permitido si aparece nueva información.

## Entregables
- Registro de clasificación por solicitud
- Log de enrutamiento
- Métricas de exactitud de triage en el tiempo
