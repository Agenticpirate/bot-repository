# ORQUESTACION.md

## Diagrama

    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Paso 1  │──>│  Paso 2  │──>│  Paso 3  │──>│  Paso N  │
    │  Agente  │   │  Agente  │   │  Agente  │   │  Agente  │
    └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
         │ fallo        │ fallo        │ fallo        │
         │              │              │              │
         ▼              ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │Comp-1    │<──│Comp-2    │<──│Comp-3    │
    │(deshacer)│   │(deshacer)│   │(deshacer)│
    └──────────┘   └──────────┘   └──────────┘
          │
          ▼
    ┌──────────────────────────────────┐
    │  Log de Saga (auditoría eventos) │
    └──────────────────────────────────┘


## Workflow
Saga (Transacciones Compensatorias)

## Objetivo
Ejecutar un workflow multi-paso que modifica estado distribuido, garantizando consistencia al definir una acción compensatoria para cada paso. Si algún paso falla, todos los pasos previos se deshacen en orden inverso, dejando el sistema en su estado original.

## Roles
- **Agentes de paso:** cada uno ejecuta un paso lógico y emite un evento de éxito/fallo.
- **Agentes de compensación:** uno por paso; cada uno sabe exactamente cómo deshacer los cambios de ese paso.
- **Orquestador de Saga:** dueño de la máquina de estados de ejecución, dispara pasos y compensaciones, escribe el log de eventos.
- **Log de Saga:** registro de auditoría append-only de cada evento (paso ejecutado, paso fallido, compensación ejecutada, saga completada/abortada).

## Cuándo usar
- Workflows que escriben en múltiples sistemas externos y deben mantenerse consistentes.
- Operaciones de larga duración donde las transacciones distribuidas son impracticables.
- Cualquier proceso multi-paso donde la compleción parcial es peor que el fallo total.
- Procesamiento de pedidos, flujos de pago, aprovisionamiento multi-servicio, migraciones de datos.

## Protocolo
1. Orquestador inicializa la saga con un ID único y registra el inicio.
2. Ejecutar Agente del Paso 1. En éxito: registrar y pasar al paso 2.
3. Ante cualquier fallo de un paso:
   a. Registrar el fallo con ID de paso, error y marca de tiempo.
   b. Disparar el Agente de Compensación del paso fallido (si el paso tuvo éxito parcial).
   c. Trabajar hacia atrás: disparar el Agente de Compensación de cada paso previamente completado.
   d. Registrar el resultado de cada compensación.
4. Si todas las compensaciones tienen éxito → registrar saga abortada limpiamente; reportar error claro al caller.
5. Si una compensación falla → registrar fallo de compensación; escalar a humano inmediatamente.
6. Si todos los pasos completan exitosamente → registrar saga confirmada.

## Reglas de compensación
- Las acciones de compensación deben ser idempotentes: seguras de reintentar si fallan una vez.
- Cada compensación debe estar registrada antes de que su paso se ejecute — sin compensaciones retroactivas.
- El orden de compensación es estrictamente inverso: el paso N se deshace antes que el paso N-1.
- Las compensaciones nunca deben llamar a pasos downstream — solo deshacer los cambios de su propio paso.

## Reglas
- Cada paso debe tener una compensación registrada antes de que la saga comience.
- Los IDs de saga deben ser globalmente únicos e incluirse en cada evento del log.
- Ningún paso puede proceder si falta el evento de log del paso anterior.
- Los timeouts cuentan como fallos y disparan compensación.
- Reintentar una compensación fallida una vez antes de escalar a humano.

## Entregables
- Resultado de la saga: `confirmada` | `abortada` | `escalada`.
- Log completo de eventos con ID de saga, marcas de tiempo y estado por paso.
- Log de compensación para todas las sagas abortadas.
- Alerta al responsable si alguna saga queda en estado `escalada`.
