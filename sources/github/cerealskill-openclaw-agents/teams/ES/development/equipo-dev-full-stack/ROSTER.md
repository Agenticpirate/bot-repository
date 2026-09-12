# ROSTER.md

## Equipo
Equipo Dev Full-Stack

## Objetivo
Entregar features de software listas para producción desde los requisitos hasta el deploy usando un pipeline con etapas definidas. Cada etapa tiene un dueño específico y debe pasar antes de avanzar.

## Miembros

| Agente | Rol | Responsabilidad |
|--------|-----|-----------------|
| `backend-engineer` | Ingeniero Líder | Escribe, revisa y refactoriza código; dueño de las decisiones de arquitectura técnica |
| `product-owner` | Product Owner | Escribe specs y criterios de aceptación; gestiona el backlog; firma los entregables |
| `platform-engineer` | Ingeniero de Release | Gestiona CI/CD, provisioning de infra, deploys canary y rollbacks |

## Modelo de Interacción

PO define → Dev implementa → SRE hace el release → PO acepta.

```
┌─────────────────┐      ┌──────────────────┐
│  Product Owner  │─────>│ Ingeniero Líder  │
│  (requisitos)   │      │ (código + review)│
└─────────────────┘      └────────┬─────────┘
                                   │ PR merged
                                   v
                          ┌──────────────────────┐
                          │ Ingeniero de Release │
                          │ (CI/CD + deploy)     │
                          └────────┬─────────────┘
                                   │ deployado
                                   v
                          ┌──────────────────┐
                          │  Product Owner   │
                          │  (aceptación)    │
                          └──────────────────┘
```

## Cuándo usarlo
- Construyendo una feature nueva desde cero con etapas de ownership claras.
- Corriendo un sprint donde requisitos, desarrollo y ops son responsabilidades separadas.
- Necesitás trazabilidad desde el spec hasta el deploy en producción.

## Casos de Uso
- **Sprint de feature:** PO escribe stories → Dev implementa → SRE despliega a staging → PO acepta → SRE promueve a prod.
- **Hotfix:** Dev diagnostica y corrige → SRE despliega el hotfix → PO confirma la resolución.
- **Cambio de infra:** SRE propone → Dev revisa el impacto → SRE ejecuta con aprobación del PO.

## Reglas
- Ningún código llega a prod sin CI pasando.
- Se requiere aceptación del PO antes de cualquier promoción a producción.
- SRE está de guardia 24h después de cada deploy.
- Dev es dueño del code review — sin auto-merges sin revisión.
