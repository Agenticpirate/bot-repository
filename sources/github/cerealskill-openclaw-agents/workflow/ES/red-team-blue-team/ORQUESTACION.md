# ORQUESTACION.md

## Diagrama

    ┌──────────┐                    ┌──────────┐
    │   Blue   │─── entrega v1 ───>│   Red    │
    │   Team   │                    │   Team   │
    └────┬─────┘                    └────┬─────┘
         │                               │
         │                               v
         │                         ┌───────────┐
         │                         │  Atacar / │
         │                         │  Probar   │
         │                         └─────┬─────┘
         │                               │
         v                               v
    ┌──────────┐  hallazgos  ┌───────────────┐
    │  Blue    │<────────────│  Reporte Red  │
    │  Corrige │             │(sev+evidencia)│
    └────┬─────┘             └───────────────┘
         │
         v
    ┌──────────┐
    │ Re-test  │
    │ + cierre │
    └──────────┘

## Workflow
Red-team / Blue-team

## Objetivo
Fortalecer calidad/seguridad con un equipo que ataca supuestos (Red) y otro que defiende/corrige (Blue).

## Roles
- **Blue Team:** diseña e implementa solución inicial.
- **Red Team:** busca fallas, abuso, bypass y edge cases.
- **Moderador:** decide severidad y prioridad de fixes.

## Protocolo
1. Blue entrega v1 + supuestos.
2. Red ejecuta batería de ataques/pruebas adversariales.
3. Red reporta hallazgos (severidad + evidencia).
4. Blue corrige y documenta mitigaciones.
5. Re-test de Red para cierre.

## Criterios de severidad
- **Crítico:** riesgo de caída o compromiso alto.
- **Alto:** impacto funcional importante.
- **Medio/Bajo:** mejoras o hardening incremental.

## Cierre
- Lista de hallazgos cerrados
- Riesgos aceptados explícitamente
