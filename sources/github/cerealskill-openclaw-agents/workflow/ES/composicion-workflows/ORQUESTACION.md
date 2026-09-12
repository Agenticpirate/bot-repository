# ORQUESTACION.md

## Diagrama

    ┌──────────────────────────────────────────┐
    │            Evento Disparador             │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │        Compositor (orquestador)           │
    │  (lee plan de composición + despacha)     │
    └────┬─────────────┬─────────────┬─────────┘
         │             │             │
         ▼             ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐
    │Workflow │  │Workflow  │  │Workflow  │
    │   A     │  │   B      │  │   C      │
    │(triage) │  │(incidente│  │(on-call) │
    └────┬────┘  └────┬─────┘  └────┬─────┘
         │            │             │
         ▼            ▼             ▼
    ┌──────────────────────────────────────────┐
    │     Compositor (recoger + rutear)         │
    │  si A=sev1 → B; si A=sev3 → C           │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │          Workflow Seleccionado            │
    │       (ejecuta hasta completar)           │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │      Post-workflow (opcional)              │
    │  (ej: planeación-semanal para follow-up)  │
    └──────────────────────────────────────────┘


## Workflow
Composición de Workflows (meta-orquestación)

## Objetivo
Combinar patrones de workflow existentes en procesos end-to-end más grandes encadenándolos, ramificándolos o ejecutándolos en paralelo — reutilizando patrones probados sin reinventar la orquestación.

## Roles
- **Compositor:** el meta-orquestador que lee un plan de composición y despacha a workflows individuales.
- **Workflows Hijos:** cualquier patrón de workflow existente (triage, modo-incidente, bucle-retroalimentación, etc.) ejecutándose como unidad autónoma.
- **Shuttle de Contexto:** transporta estado y outputs entre workflows hijos.

## Cuándo usar
- Procesos complejos que abarcan múltiples patrones de workflow existentes.
- Cuando necesitás ruteo condicional (ej: triage → modo-incidente O triage → on-call según severidad).
- Cuando workflows deben correr en paralelo y sincronizar en un punto de join.
- Para evitar duplicar lógica de orquestación que ya existe.

## Modos de composición

### Secuencial
```
Workflow A → Workflow B → Workflow C
```
Output de A alimenta a B, output de B alimenta a C.

### Condicional
```
Workflow A → si condición_X → Workflow B
           → si condición_Y → Workflow C
```
Rutear a diferentes workflows según el resultado de uno previo.

### Paralelo + Join
```
Workflow A ──┐
Workflow B ──┼── Join → Workflow D
Workflow C ──┘
```
Ejecutar múltiples workflows concurrentemente, esperar a todos, luego alimentar al siguiente.

### Loop
```
Workflow A → Workflow B → si !terminó → Workflow A (repetir)
```
Iterar a través de un conjunto de workflows hasta que se cumpla una condición.

## Protocolo
1. Definir un plan de composición (secuencia de workflows + reglas de ruteo).
2. Compositor inicializa contexto con datos del evento disparador.
3. Compositor despacha al primer workflow(s) según el plan.
4. Workflow hijo ejecuta hasta completar y retorna output + status.
5. Compositor evalúa reglas de ruteo y despacha a siguiente workflow(s).
6. Shuttle de Contexto preserva estado acumulado entre boundaries.
7. Repetir hasta que el plan esté completo.
8. Compositor produce output final agregado.

## Reglas
- Los workflows hijos son cajas negras — el Compositor nunca entra en sus internals.
- Cada workflow hijo recibe contexto limpio (input original + outputs acumulados).
- Fallos en un workflow hijo siguen el manejo de errores propio de ese workflow primero.
- Si un workflow hijo falla y no puede auto-recuperarse, el Compositor decide: saltear, reintentar o abortar composición.
- Los planes de composición son declarativos (config/YAML), no código imperativo.

## Entregables
- Traza de ejecución de composición (qué workflows corrieron, en qué orden, con qué inputs/outputs)
- Status y outputs por workflow
- Resultado final agregado
- Log de decisiones de ruteo (por qué se eligió cada camino)
