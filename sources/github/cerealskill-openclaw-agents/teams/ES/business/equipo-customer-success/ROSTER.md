# ROSTER.md

## Equipo
Equipo de Customer Success

## Objetivo
Maximizar la retención y el valor de vida del cliente guiándolo al éxito desde el día 1, monitoreando señales de salud e interviniendo de forma proactiva antes de que ocurra el churn.

## Miembros

| Agente | Rol | Responsabilidad |
|--------|-----|-----------------|
| `onboarding-guide` | Especialista de Onboarding | Corre journeys de onboarding estructurados para llevar a los clientes al primer valor rápidamente |
| `customer-success-manager` | CSM | Gestiona relaciones en curso, QBRs y oportunidades de upsell |
| `nps-followup` | Analista NPS | Procesa respuestas de NPS, cierra el loop de feedback y escala a los detractores |
| `churn-predictor` | Predictor de Churn | Monitorea señales de uso y puntúa las cuentas por riesgo de churn |

## Modelo de Interacción

Onboarding activa → CSM nutre → Predictor de Churn detecta riesgo → NPS cierra el loop de feedback.

```
┌────────────────────────┐      ┌──────────────────────────────┐
│    Onboarding Guide    │─────>│  Customer Success Manager    │
│   (onboarding-guide)   │      │ (customer-success-manager)   │
│   (días 1-30)          │      │  (relación en curso)         │
└────────────────────────┘      └──────────────┬───────────────┘
                                               │
                    ┌──────────────────────────┴──────────────────────────┐
                    v                                                     v
          ┌──────────────────────┐                          ┌──────────────────────┐
          │   Churn Predictor   │                          │    NPS Followup      │
          │  (churn-predictor)  │                          │   (nps-followup)     │
          │  (scoring de riesgo)│                          │   (loop de feedback) │
          └──────────────────────┘                          └──────────────────────┘
```

## Cuándo usarlo
- Tenés un producto SaaS y querés reducir el churn de forma sistemática.
- El onboarding de clientes es inconsistente y el tiempo a valor es muy largo.
- Enviás encuestas NPS pero no tenés capacidad para hacer follow-up a cada respuesta.

## Casos de Uso
- **Activación de nuevo cliente:** Onboarding corre el checklist → CSM agenda check-in de 30 días.
- **Cuenta en riesgo:** Predictor detecta bajo uso → CSM hace outreach proactivo con plan de éxito.
- **NPS detractor:** NPS Followup registra el score → escala al CSM → CSM agenda llamada de recuperación.

## Reglas
- Cada nuevo cliente tiene un checklist de onboarding asignado con fecha límite de completado.
- Las cuentas por debajo del umbral de salud se escalan al CSM en 24h.
- Todos los detractores NPS (0-6) reciben follow-up en 48h.
- El CSM es dueño de la relación con la cuenta — todos los touchpoints se registran en el CRM.
