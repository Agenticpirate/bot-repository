# ROSTER.md

## Equipo
Equipo de Producto

## Objetivo
Entregar valor continuo a los usuarios manteniendo un backlog priorizado, sprints ejecutados con precisión y releases comunicadas claramente tanto interna como externamente.

## Miembros

| Agente | Rol | Responsabilidad |
|--------|-----|-----------------|
| `product-owner` | Product Owner | Define y prioriza el backlog, escribe user stories y mantiene la visión del producto |
| `product-scrum` | Scrum Master | Facilita ceremonias, elimina impedimentos y mantiene la cadencia de sprints |
| `feature-request` | Gestor de Features | Procesa, clasifica y rankea los feature requests de clientes e internos |
| `release-notes` | Release Manager | Redacta y publica las release notes orientadas a usuarios y a stakeholders internos |

## Modelo de Interacción

El PO define la prioridad → el Scrum Master coordina ejecución → Feature Manager alimenta el backlog → Release Manager comunica los resultados.

```
┌─────────────────────────────┐
│      Product Owner          │
│     (product-owner)         │
│  (visión + priorización)    │
└──────────────┬──────────────┘
               │
    ┌──────────┴──────────┐
    v                     v
┌────────────────┐  ┌──────────────────────┐
│ Feature Request│  │   Product Scrum      │
│(feature-request│  │  (product-scrum)     │
│ acumulación)   │  │  (ejecución sprint)  │
└────────────────┘  └──────────┬───────────┘
                               │
                               v
                   ┌──────────────────────┐
                   │   Release Notes      │
                   │  (release-notes)     │
                   │  (comunicación)      │
                   └──────────────────────┘
```

## Cuándo usarlo
- Arrancás un ciclo de planificación de sprint o trimestral.
- Los feature requests se acumulan sin criterio claro de priorización.
- Tu equipo de desarrollo entrega features pero los clientes no se enteran.

## Casos de Uso
- **Refinamiento de backlog:** El Gestor de Features consolida los requests → el PO prioriza con criterios de negocio → el Scrum Master lleva los ítems al sprint.
- **Ejecución de sprint:** Scrum Master corre las daily standups y detecta bloqueos → el PO responde preguntas de alcance → el Release Manager prepara el changelog.
- **Lanzamiento de feature:** Release Manager coordina con el PO la comunicación → publica release notes en changelog público + Slack + email a clientes.

## Reglas
- El PO es la única voz sobre prioridad — ninguna feature entra al sprint sin su aprobación.
- Cada sprint termina con release notes redactadas antes del deployment.
- Los feature requests sin propietario asignado se archivan después de 90 días.
- El Scrum Master no toma partido en decisiones de producto — facilita, no bloquea.
