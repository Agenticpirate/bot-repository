# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │              Supervisor                  │
    │  (monitor heartbeat + check progreso)   │
    └────┬─────────────┬─────────────┬─────────┘
         │             │             │
         v             v             v
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │Worker 1 │  │Worker 2 │  │Worker N │
    │  [ok]   │  │  [ok]   │  │ [fail]  │──┐
    └─────────┘  └─────────┘  └─────────┘  │
                                           v
                                    ┌────────────┐
                                    │  Agente de │
                                    │Recuperacion│
                                    │(retomar/   │
                                    │    redo)   │
                                    └────────────┘

## Workflow
Watchdog / Supervisor (monitorear y recuperar)

## Objetivo
Monitorear continuamente la salud de agentes y progreso de tareas, interviniendo automáticamente cuando se detectan fallos o estancamientos.

## Roles
- **Supervisor:** monitorea heartbeats, progreso y calidad de salida.
- **Agentes worker:** ejecutan tareas asignadas y reportan estado.
- **Agente de recuperación:** toma el control o reinicia trabajo fallido.

## Cuándo usar
- Workflows de agentes de larga duración o desatendidos.
- Tareas críticas que no pueden fallar silenciosamente.
- Ambientes donde los agentes pueden colgarse o producir salida degradada.

## Protocolo
1. Workers se registran con supervisor e inician tareas.
2. Workers envían heartbeats periódicos con actualizaciones de progreso.
3. Supervisor verifica intervalos de heartbeat y umbrales de progreso.
4. Ante heartbeat perdido o progreso estancado:
   - Alertar y esperar un período de gracia.
   - Si sigue sin responder, disparar agente de recuperación.
5. Agente de recuperación retoma desde último checkpoint o reinicia tarea.
6. Supervisor registra todas las intervenciones.

## Health checks
- **Heartbeat:** esperado cada N segundos.
- **Progreso:** debe avanzar más allá del checkpoint dentro del timeout.
- **Calidad de salida:** spot-check de salidas contra baseline.

## Reglas
- Supervisor nunca ejecuta trabajo directamente — solo monitorea y delega.
- La recuperación debe ser idempotente (seguro reintentar).
- Todas las intervenciones registradas con timestamp y razón.

## Entregables
- Log de salud por worker
- Historial de intervenciones
- Métricas de uptime y recuperación
