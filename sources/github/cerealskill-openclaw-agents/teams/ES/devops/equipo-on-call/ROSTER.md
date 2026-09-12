# ROSTER.md

## Equipo
Equipo On-Call

## Objetivo
Detectar, clasificar y resolver incidentes de producción de forma automática — escalando a humanos solo cuando es necesario. Este equipo opera 24/7 y sigue un ciclo de vida de incidentes estructurado para minimizar el MTTR.

## Miembros

| Agente | Rol | Responsabilidad |
|--------|-----|-----------------|
| `incident-responder` | Comandante de Incidente | Dueño del ciclo de vida: declara, coordina, delega y cierra incidentes |
| `flight-scraper` | Vigilante de Datos | Monitorea fuentes externas, health checks de API e integridad de pipelines |

## Modelo de Interacción

Alerta → Comandante clasifica → asigna tareas → Vigilante verifica la solución → Comandante cierra.

```
┌─────────────────┐      ┌──────────────────────────┐
│  Alerta / PD    │─────>│  Comandante de Incidente │
│  (disparador)   │      │  (incident-responder)    │
└─────────────────┘      └───────────┬──────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    v                                   v
          ┌──────────────────┐              ┌──────────────────┐
          │ Vigilante Datos  │              │ Escalación Humana│
          │ (flight-scraper) │              │ (solo P0)        │
          └────────┬─────────┘              └──────────────────┘
                   │
                   v
          ┌──────────────────┐
          │ Verificar y Cerrar│
          └──────────────────┘
```

## Cuándo usarlo
- Tu servicio está en producción y necesitás respuesta automática 24/7.
- Querés reducir la fatiga de alertas resolviendo automáticamente patrones conocidos.
- Necesitás RCA estructurado después de cada incidente.

## Casos de Uso
- **Caída de API:** Vigilante detecta alta tasa de errores → Comandante declara P1 → ejecuta runbook automático → verifica recuperación.
- **Pipeline detenido:** Vigilante detecta retraso → Comandante escala al equipo de datos → monitorea SLA.
- **Limpieza de falsos positivos:** Comandante revisa historial de alertas y suprime checks ruidosos.

## Reglas
- Toda alerta debe ser reconocida en menos de 5 minutos.
- Los incidentes P0 siempre notifican a un humano además de la respuesta automática.
- No se puede cerrar un incidente sin un health check verificado.
- Todas las acciones se registran para revisión post-incidente.
