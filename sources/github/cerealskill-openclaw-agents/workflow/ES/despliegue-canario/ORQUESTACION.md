# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │          Cambio / Despliegue             │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │        Agente Canario                    │
    │   (ejecutar en scope reducido: 5-10%)    │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │        Agente Observador                 │
    │   (monitorear métricas + tasa de error)  │
    └────────────────────┬─────────────────────┘
                         ▼
                  ┌────────────┐
                  │ ¿Métricas  │
                  │  sanas?    │
                  └─────┬──────┘
              sí        │    no
         ┌──────────────┴──────────────┐
         ▼                             ▼
    ┌──────────────┐         ┌──────────────────┐
    │  Expandir a  │         │ Agente Rollback  │
    │  siguiente   │         │ (revertir canario)│
    │  tier        │         └────────┬─────────┘
    │ 25%→50%→100% │                  ▼
    └──────┬───────┘         ┌──────────────────┐
           │                 │Reporte Incidente │
           ▼                 └──────────────────┘
    ┌──────────────┐
    │  Rollout     │
    │  Completo    │
    └──────────────┘


## Workflow
Despliegue Canario (despliegue progresivo)

## Objetivo
Minimizar riesgo desplegando cambios a un subconjunto pequeño primero, validando métricas, y expandiendo progresivamente — o revirtiendo — según la salud observada.

## Roles
- **Agente Canario:** ejecuta el cambio en el scope canario (radio de impacto limitado).
- **Agente Observador:** monitorea métricas de salud, tasas de error, latencia y KPIs de negocio durante cada tier.
- **Agente Rollback:** revierte el canario si las métricas superan umbrales.
- **Controlador de Promoción:** decide progresión de tiers basado en datos del Observador.

## Cuándo usar
- Deploys a producción o entornos compartidos.
- Cambios de configuración con impacto incierto.
- Cualquier cambio donde "probar en prod de forma segura" es la estrategia.
- Rollouts de tareas multi-agente donde querés validar el enfoque en un subconjunto.

## Protocolo
1. Definir tiers canarios: 5% → 25% → 50% → 100% (configurable).
2. Agente Canario ejecuta cambio en scope del tier 1.
3. Agente Observador monitorea durante ventana de observación (ej: 10 min por tier).
4. Controlador de Promoción evalúa:
   - Tasa de error < umbral → promover a siguiente tier.
   - Tasa de error ≥ umbral → activar Agente Rollback.
5. Repetir para cada tier hasta 100% o rollback.
6. En rollout completo: Observador sigue monitoreando durante período de bake.

## Umbrales de salud
- **Tasa de error:** < 1% de incremento sobre baseline
- **Latencia p99:** < 20% de incremento sobre baseline
- **KPIs de negocio:** sin degradación más allá de la tolerancia

## Schedule de tiers (default)
| Tier | Scope | Ventana de observación |
|------|-------|------------------------|
| 1    | 5%    | 10 min                 |
| 2    | 25%   | 15 min                 |
| 3    | 50%   | 15 min                 |
| 4    | 100%  | 30 min (bake)          |

## Reglas
- Nunca saltear tiers (nada de 5% → 100%).
- Rollback es automático si se superan umbrales — no requiere aprobación manual.
- Observador debe comparar contra baseline pre-deploy, no valores absolutos.
- Todas las transiciones de tier loggeadas con snapshot de métricas.

## Entregables
- Log de progresión del deploy (tier, timestamp, métricas)
- Dashboard de salud por tier
- Estado final: rollout-completo | rollback-en-tier-N
- Reporte de bake post-deploy
