# ROSTER.md

## Equipo
Equipo Legal y Compliance

## Objetivo
Garantizar que todos los contratos, flujos de datos y procesos internos cumplan con los marcos regulatorios aplicables (GDPR, privacidad, normativa sectorial), minimizando la exposición legal de la organización.

## Miembros

| Agente | Rol | Responsabilidad |
|--------|-----|-----------------|
| `contract-reviewer` | Revisor de Contratos | Analiza y marca cláusulas problemáticas en contratos comerciales, de proveedores y de empleados |
| `gdpr-auditor` | Auditor GDPR | Audita el procesamiento de datos personales contra los requisitos del GDPR y emite informes |
| `privacy-officer` | Oficial de Privacidad | Gestiona las políticas de privacidad, los avisos de cookies y las solicitudes de derechos de los titulares (DSAR) |
| `risk-assessor` | Evaluador de Riesgos | Puntúa el riesgo legal en nuevas iniciativas, productos o relaciones con terceros |

## Modelo de Interacción

Cada flujo comienza con una evaluación de riesgo → el Revisor lee los contratos → el Auditor GDPR verifica el cumplimiento normativo → el Oficial de Privacidad mantiene las políticas actualizadas.

```
┌──────────────────────────┐
│     Risk Assessor        │
│    (risk-assessor)       │
│  (assessment inicial)    │
└─────────────┬────────────┘
              │
   ┌──────────┴────────────┐
   v                       v
┌──────────────────────┐  ┌──────────────────────────┐
│  Contract Reviewer   │  │      GDPR Auditor        │
│ (contract-reviewer)  │  │     (gdpr-auditor)       │
│  (revisión legal)    │  │   (cumplimiento datos)   │
└──────────────────────┘  └───────────┬──────────────┘
                                      │
                                      v
                          ┌──────────────────────────┐
                          │    Privacy Officer       │
                          │   (privacy-officer)      │
                          │  (políticas + DSARs)     │
                          └──────────────────────────┘
```

## Cuándo usarlo
- Necesitás revisar contratos con un tercero antes de firmar.
- Tu empresa procesa datos personales y necesita verificar el cumplimiento del GDPR.
- Estás lanzando una nueva feature y querés saber la exposición legal antes del release.

## Casos de Uso
- **Revisión de contrato de proveedor:** El Evaluador de Riesgos puntúa al proveedor → el Revisor analiza el contrato → el Oficial de Privacidad verifica las cláusulas de tratamiento de datos.
- **Auditoría de privacidad:** El Auditor GDPR mapea los flujos de datos → el Oficial de Privacidad actualiza los registros de actividades de tratamiento (RoPA).
- **Nueva feature con datos personales:** El Evaluador de Riesgos hace un DPIA → el Auditor GDPR valida → el Oficial de Privacidad actualiza la política de privacidad.

## Reglas
- Ningún contrato se firma sin revisión del `contract-reviewer`.
- Las solicitudes de ejercicio de derechos (DSARs) se responden dentro de los 30 días legales.
- Todo nuevo procesamiento de datos personales requiere un DPIA si supera el umbral de riesgo.
- Los hallazgos de auditoría se documentan y tienen un plazo de remediación definido.
