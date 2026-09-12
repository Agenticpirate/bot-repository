# ROSTER.md

## Equipo
Equipo de Plataforma de Datos

## Objetivo
Entregar datos confiables, consultables y visualizados al negocio — desde la ingesta de fuentes crudas hasta dashboards pulidos — usando un pipeline de datos con etapas definidas.

## Miembros

| Agente | Rol | Responsabilidad |
|--------|-----|-----------------|
| `data-engineer` | Ingeniero de Datos | Diseña la arquitectura de datos, gestiona warehouses y asegura la confiabilidad del pipeline |
| `etl-pipeline` | Especialista ETL | Construye flujos extract-transform-load entre sistemas fuente y el warehouse |
| `sql-assistant` | Analista SQL | Escribe, revisa y optimiza queries analíticas y modelos de datos |
| `dashboard-builder` | Desarrollador BI | Construye dashboards, informes y analytics self-serve para stakeholders |

## Modelo de Interacción

Ingeniero diseña → ETL ingesta → SQL modela → Dashboard visualiza.

```
┌──────────────────────┐      ┌──────────────────────┐
│   Data Engineer      │─────>│   ETL Pipeline       │
│  (data-engineer)     │      │  (etl-pipeline)      │
│  (arquitectura)      │      │  (ingesta)           │
└──────────────────────┘      └──────────┬───────────┘
                                         │ datos crudos
                                         v
                              ┌──────────────────────┐
                              │   SQL Assistant      │
                              │  (sql-assistant)     │
                              │  (modelado)          │
                              └──────────┬───────────┘
                                         │ modelos limpios
                                         v
                              ┌──────────────────────────┐
                              │   Dashboard Builder      │
                              │  (dashboard-builder)     │
                              │  (visualización)         │
                              └──────────────────────────┘
```

## Cuándo usarlo
- Estás construyendo un nuevo stack de analytics o migrando desde planillas.
- Los stakeholders necesitan dashboards self-serve con datos frescos y confiables.
- Los pipelines existentes son frágiles y necesitan revisión arquitectónica.

## Casos de Uso
- **Nueva fuente de datos:** Ingeniero evalúa el schema → ETL construye el conector → SQL modela los datos → Dashboard agrega gráficos.
- **Actualización de dashboard:** SQL reescribe queries obsoletas → Dashboard publica vistas actualizadas.
- **Fallo de pipeline:** Ingeniero diagnostica → ETL re-ejecuta los jobs fallidos → SQL valida la integridad de los datos.

## Reglas
- Ningún dato crudo va directamente a dashboards — siempre pasa por una capa de modelos SQL.
- Todos los jobs ETL tienen idempotencia y lógica de reintento.
- Los cambios de schema requieren revisión del Ingeniero de Datos antes de que ETL corra.
- Los dashboards incluyen timestamps de frescura de datos.
