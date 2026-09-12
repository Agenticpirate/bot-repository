# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │         Orquestador de Workflow          │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────┐   ┌──────────────┐   ┌──────────┐
    │  Fase 1  │──>│  CHECKPOINT 1│──>│  Fase 2  │
    │  Agentes │   │  (snapshot)  │   │  Agentes │
    └──────────┘   └──────┬───────┘   └────┬─────┘
                          │                ▼
                          │         ┌──────────────┐   ┌──────────┐
                          │         │ CHECKPOINT 2 │──>│  Fase 3  │
                          │         │  (snapshot)  │   │  Agentes │
                          │         └──────┬───────┘   └──────────┘
                          │                │
                  reanudar│                │ reanudar
                  desde C1│                │ desde C2
                          ▼                ▼
                   ┌─────────────────────────────┐
                   │     Almacén de Snapshots     │
                   │ (inmutable, nombrado, versionado)│
                   └─────────────────────────────┘


## Workflow
Checkpoint / Snapshot

## Objetivo
Guardar snapshots inmutables del estado del workflow en puntos definidos para que workflows de larga duración puedan pausarse y reanudarse, bifurcarse en variantes paralelas, o revertir a un punto conocido sin reiniciar desde cero.

## Roles
- **Orquestador de workflow:** gestiona las transiciones de fase, dispara la creación de snapshots y maneja las solicitudes de restauración.
- **Agentes de fase:** ejecutan trabajo dentro de cada fase y señalan su compleción al Orquestador.
- **Agente de snapshot:** serializa y almacena el estado completo del workflow (contexto, salidas parciales, decisiones) en cada checkpoint.
- **Agente de restauración:** carga un snapshot nombrado, valida su integridad y devuelve el control al Orquestador.
- **Almacén de snapshots:** almacenamiento inmutable y versionado de todos los snapshots (solo-agregar).

## Cuándo usar
- Workflows de larga duración (horas/días) que pueden ser interrumpidos.
- Workflows de alto costo donde reiniciar desde cero ante un fallo es inaceptable.
- Workflows experimentales donde se quiere bifurcar en un punto de decisión y explorar múltiples caminos.
- Workflows regulatorios que requieren snapshots de auditoría en un punto del tiempo.
- Workflows con puertas de revisión humana donde el trabajo debe pausarse hasta la aprobación.

## Protocolo
1. El Orquestador define las ubicaciones de checkpoint y el esquema de nombres de snapshots antes de comenzar.
2. Las fases se ejecutan; cuando una fase completa, el Orquestador dispara el Agente de snapshot.
3. El Agente de snapshot captura:
   - Todas las salidas de agentes producidas hasta ahora.
   - Metadatos del workflow (fase, paso, configuración, marcas de tiempo).
   - Decisiones pendientes y su contexto.
4. El snapshot se almacena con un ID único, nombre y marca de tiempo. El Orquestador registra el evento de checkpoint.
5. El Orquestador continúa a la siguiente fase.
6. Al reanudar (después de interrupción o rollback explícito):
   a. El Agente de restauración carga el snapshot objetivo.
   b. Valida la integridad del snapshot (checksum).
   c. El Orquestador restaura el estado y reanuda desde el siguiente paso del checkpoint.
7. Para bifurcación: el Agente de restauración carga un checkpoint; el Orquestador inicia una nueva rama del workflow desde ese punto con un conjunto de parámetros diferente.

## Contenido de los snapshots
- `snapshot_id`: identificador único e inmutable.
- `workflow_id` + `checkpoint_name`.
- `phase_outputs`: todas las salidas de agentes producidas antes de este checkpoint.
- `pending_context`: todo lo necesario para continuar desde aquí.
- `config_hash`: garantiza que el workflow restaurado usa la misma configuración.
- `created_at`: marca de tiempo.
- `checksum`: verificación de integridad.

## Reglas
- Los snapshots son inmutables: nunca sobreescribir, solo agregar nuevos snapshots.
- Un snapshot debe ser verificado (check de checksum) antes de cualquier restauración.
- El Orquestador debe registrar cada evento de creación y restauración de checkpoint.
- Los workflows bifurcados desde snapshots deben obtener un nuevo `workflow_id` para evitar colisiones de ID.
- Definir ubicaciones de checkpoint antes de comenzar — sin snapshots retroactivos.
- El Almacén de snapshots debe retener los snapshots durante el período de retención definido antes de purgarlos.

## Entregables
- Salida completa del workflow (desde la última fase o rama).
- Manifiesto de checkpoints: todos los snapshots creados, sus IDs, fases y marcas de tiempo.
- Log de restauración: cualquier checkpoint usado para reanudar o bifurcar.
- Reporte de uso de almacenamiento por snapshot.
