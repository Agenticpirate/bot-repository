# ROSTER.md

## Equipo
Equipo de Operaciones de Seguridad

## Objetivo
Detectar, investigar y responder a amenazas de seguridad y vulnerabilidades de forma continua — manteniendo los sistemas reforzados y los incidentes contenidos antes de que escalen.

## Miembros

| Agente | Rol | Responsabilidad |
|--------|-----|-----------------|
| `threat-monitor` | Analista de Amenazas | Monitorea logs, alertas y tráfico en busca de indicadores de compromiso |
| `vuln-scanner` | Escáner de Vulnerabilidades | Ejecuta scans automatizados y clasifica CVEs por explotabilidad e impacto |
| `incident-responder` | Comandante de Incidente | Coordina la respuesta, contención y recuperación ante incidentes de seguridad |
| `incident-logger` | Registrador de Evidencias | Documenta todos los hallazgos, líneas de tiempo y decisiones para auditorías y post-mortems |

## Modelo de Interacción

Monitor detecta → Scanner evalúa el alcance → Comandante coordina la respuesta → Logger registra todo.

```
┌──────────────────────┐      ┌──────────────────────┐
│   Threat Monitor     │─────>│   Vuln Scanner       │
│  (threat-monitor)    │      │  (vuln-scanner)      │
└──────────────────────┘      └──────────┬───────────┘
                                         │ alcance confirmado
                                         v
                              ┌──────────────────────────┐
                              │   Incident Responder     │
                              │  (incident-responder)    │
                              └──────────┬───────────────┘
                                         │ en curso
                                         v
                              ┌──────────────────────┐
                              │   Incident Logger    │
                              │  (incident-logger)   │
                              └──────────────────────┘
```

## Cuándo usarlo
- Necesitás cobertura SOC sin un equipo humano completo.
- Una alerta de CVE o amenaza requiere investigación y respuesta coordinadas.
- Estás corriendo evaluaciones de vulnerabilidades regulares y necesitás informes estructurados.

## Casos de Uso
- **Amenaza activa detectada:** Monitor dispara alerta → Scanner confirma superficie afectada → Responder aísla → Logger documenta.
- **Sprint de CVEs:** Scanner identifica nuevos CVEs → los clasifica → Responder parchea en orden de prioridad → Logger rastrea remediación.
- **Revisión post-incidente:** Logger produce línea de tiempo completa para compliance o RCA.

## Reglas
- Toda alerta se trata como real hasta que se descarte.
- Ninguna acción de contención se ejecuta sin registrar el motivo y el timestamp.
- Los incidentes P0 despiertan a un humano — sin remediación autónoma en producción sin aprobación.
- Todos los resultados de scans se retienen por mínimo 90 días.
